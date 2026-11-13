/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { handlePreview } from './handle_preview';
import {
  createAttachmentLinks,
  type AttachmentLinks,
} from './dashboard_integration/attachment_links';

const buildAttachment = (origin?: string): DashboardAttachment => ({
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin,
  data: {
    title: 'Agent dashboard',
    description: 'Built by the agent',
    panels: [],
    time_range: { from: 'now-7d', to: 'now' },
  },
});

const buildDashboardApi = (savedObjectId: string | undefined, isManaged = false) => ({
  savedObjectId$: { getValue: () => savedObjectId },
  getAppContext: () => ({ currentAppId: 'dashboards' }),
  isEditableByUser: true,
  isManaged,
  setState: jest.fn(),
  setViewMode: jest.fn(),
  locator: { navigate: jest.fn(), getRedirectUrl: jest.fn() },
});

const preview = async ({
  attachment,
  dashboardApi,
  linkedDashboardExists = true,
}: {
  attachment: DashboardAttachment;
  dashboardApi?: ReturnType<typeof buildDashboardApi>;
  linkedDashboardExists?: boolean;
}) => {
  const dashboardLocator = { navigate: jest.fn(), getRedirectUrl: jest.fn() };
  const toasts = { addWarning: jest.fn(), addError: jest.fn() };
  const attachmentLinks = createAttachmentLinks();
  await handlePreview({
    attachment,
    dashboardApi: dashboardApi as unknown as DashboardApi | undefined,
    canWriteDashboards: true,
    isSidebar: true,
    dashboardLocator,
    toasts: toasts as unknown as NotificationsStart['toasts'],
    checkSavedDashboardExist: async () => linkedDashboardExists,
    attachmentLinks,
  });
  return { dashboardLocator, toasts, attachmentLinks };
};

const isNextDashboardLinked = (attachmentLinks: AttachmentLinks, attachmentId: string) => {
  const nextDashboardApi = buildDashboardApi(undefined) as unknown as DashboardApi;
  attachmentLinks.claimNextDashboardLink(nextDashboardApi);
  return attachmentLinks.isLinked(nextDashboardApi, attachmentId);
};

describe('handlePreview with a published dashboard', () => {
  it.each([
    ['linked to another existing dashboard', 'dashboard-2'],
    ['not linked to a dashboard', undefined],
  ])('navigates through the Dashboard app locator when the attachment is %s', async (_, origin) => {
    const dashboardApi = buildDashboardApi('dashboard-1');

    const { dashboardLocator } = await preview({
      attachment: buildAttachment(origin),
      dashboardApi,
    });

    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agent dashboard',
        description: 'Built by the agent',
        time_range: { from: 'now-7d', to: 'now' },
        preserveSavedFilters: false,
        dashboardId: origin,
        viewMode: 'edit',
        changedBy: ['agent'],
      })
    );
    expect(dashboardApi.locator.navigate).not.toHaveBeenCalled();
    expect(dashboardApi.setState).not.toHaveBeenCalled();
  });

  it('opens the attachment in the Dashboard app in edit mode when previewed outside of it', async () => {
    const { dashboardLocator } = await preview({ attachment: buildAttachment('dashboard-2') });

    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agent dashboard',
        preserveSavedFilters: false,
        dashboardId: 'dashboard-2',
        viewMode: 'edit',
      })
    );
  });

  it.each([
    ['it is linked to the viewed dashboard', 'dashboard-1', 'dashboard-1', true],
    ['its linked dashboard was deleted', undefined, 'deleted-dashboard', false],
  ])(
    'applies the attachment in place in edit mode when %s',
    async (_, savedObjectId, origin, linkedDashboardExists) => {
      const dashboardApi = buildDashboardApi(savedObjectId);

      const { dashboardLocator } = await preview({
        attachment: buildAttachment(origin),
        dashboardApi,
        linkedDashboardExists,
      });

      expect(dashboardApi.setState).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Agent dashboard' }),
        { changedBy: ['agent'] }
      );
      expect(dashboardApi.setViewMode).toHaveBeenCalledWith('edit');
      expect(dashboardLocator.navigate).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['linked to it', 'dashboard-1'],
    ['not linked to a dashboard', undefined],
  ])(
    'opens the attachment in a new dashboard and warns when the viewed dashboard is managed and the attachment is %s',
    async (_, origin) => {
      const dashboardApi = buildDashboardApi('dashboard-1', true);

      const { dashboardLocator, toasts } = await preview({
        attachment: buildAttachment(origin),
        dashboardApi,
      });

      expect(dashboardApi.setState).not.toHaveBeenCalled();
      expect(dashboardLocator.navigate).toHaveBeenCalledWith(
        expect.not.objectContaining({ dashboardId: expect.anything() })
      );
      expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    }
  );

  describe('links the dashboard that shows the attachment', () => {
    it('when it applies the attachment to the open dashboard', async () => {
      const dashboardApi = buildDashboardApi(undefined);

      const { attachmentLinks } = await preview({ attachment: buildAttachment(), dashboardApi });

      expect(
        attachmentLinks.isLinked(dashboardApi as unknown as DashboardApi, 'attachment-1')
      ).toBe(true);
    });

    it.each([
      ['opens it from another dashboard', false],
      ['forks a managed dashboard', true],
    ])('when it opens a new dashboard as it %s', async (_, isManaged) => {
      const { attachmentLinks } = await preview({
        attachment: buildAttachment(),
        dashboardApi: buildDashboardApi('dashboard-1', isManaged),
      });

      expect(isNextDashboardLinked(attachmentLinks, 'attachment-1')).toBe(true);
    });

    it('when it opens a new dashboard from outside the Dashboard app', async () => {
      const { attachmentLinks } = await preview({ attachment: buildAttachment() });

      expect(isNextDashboardLinked(attachmentLinks, 'attachment-1')).toBe(true);
    });

    it("but not a new dashboard when it opens the attachment's saved one", async () => {
      const { attachmentLinks } = await preview({
        attachment: buildAttachment('dashboard-2'),
        dashboardApi: buildDashboardApi('dashboard-1'),
      });

      expect(isNextDashboardLinked(attachmentLinks, 'attachment-1')).toBe(false);
    });
  });

  it('shows an error toast when the attachment fails to open', async () => {
    const dashboardApi = buildDashboardApi('dashboard-1');
    const error = new Error('Panel failed to load');
    dashboardApi.setState.mockRejectedValue(error);

    const { toasts } = await preview({ attachment: buildAttachment('dashboard-1'), dashboardApi });

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: "Couldn't apply the agent's changes to the dashboard",
    });
  });
});
