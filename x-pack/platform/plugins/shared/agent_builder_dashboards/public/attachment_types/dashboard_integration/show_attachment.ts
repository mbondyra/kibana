/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import { markAttachmentApplied } from './dashboard_equality';
import {
  openInDashboardApp,
  toDashboardLocatorParams,
  type DashboardLocator,
} from './open_in_dashboard_app';
import type { AttachmentLinks } from './attachment_links';

export type ApplyAttachmentOutcome = 'applied' | 'opened-new-dashboard';

export const APPLY_AGENT_CHANGES_ERROR_TITLE = i18n.translate(
  'xpack.agentBuilderDashboards.applyAgentChanges.errorToastTitle',
  { defaultMessage: "Couldn't apply the agent's changes to the dashboard" }
);

/**
 * Whether the agent's changes can be applied to the open dashboard itself, for a user who can
 * write dashboards.
 */
export const canApplyAgentChangesInPlace = (api: DashboardApi): boolean =>
  api.isEditableByUser && !api.isManaged;

interface ApplyAttachmentParams {
  attachment: DashboardAttachment;
  api: DashboardApi;
  dashboardLocator?: DashboardLocator;
  toasts: NotificationsStart['toasts'];
  attachmentLinks: AttachmentLinks;
}

/**
 * Applies the attachment to the open dashboard, or opens it in a new dashboard when the open one
 * can't be edited, and links the dashboard that shows it. Expects a user who can write dashboards.
 */
export const applyAttachment = async ({
  attachment,
  api,
  dashboardLocator,
  toasts,
  attachmentLinks,
}: ApplyAttachmentParams): Promise<ApplyAttachmentOutcome> => {
  const dashboardState = attachmentDataToDashboardState(attachment.data);
  if (canApplyAgentChangesInPlace(api)) {
    api.setViewMode('edit');
    const applied = api.setState(dashboardState, { changedBy: ['agent'] });
    markAttachmentApplied(api, attachment.data, applied);
    await applied;
    attachmentLinks.link(api, attachment.id);
    return 'applied';
  }

  attachmentLinks.linkNextDashboard(attachment.id, { fromApi: api });
  await openInDashboardApp(dashboardLocator, toDashboardLocatorParams(dashboardState));
  toasts.addWarning({
    title: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.newDashboardToastTitle', {
      defaultMessage: "The agent's changes were opened in a new dashboard",
    }),
    text: api.isManaged
      ? i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.managedDashboardText', {
          defaultMessage:
            "The original dashboard is managed by Elastic and can't be edited. Save the new dashboard to keep the changes.",
        })
      : i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.notEditableByUserText', {
          defaultMessage:
            "You don't have permission to edit the original dashboard. Save the new dashboard to keep the changes.",
        }),
  });
  return 'opened-new-dashboard';
};

/**
 * Opens the attachment in its saved dashboard, or in a new dashboard that gets linked to it when
 * it has none.
 */
export const openAttachmentInDashboardApp = async ({
  attachmentId,
  savedDashboardId,
  dashboardLocator,
  dashboardLocatorParams,
  attachmentLinks,
  fromApi,
}: {
  attachmentId: string;
  savedDashboardId: string | undefined;
  dashboardLocator?: DashboardLocator;
  dashboardLocatorParams: DashboardLocatorParams;
  attachmentLinks: AttachmentLinks;
  /** The dashboard it opens from, which keeps its own links. */
  fromApi?: DashboardApi;
}): Promise<void> => {
  if (!savedDashboardId) {
    attachmentLinks.linkNextDashboard(attachmentId, { fromApi });
  }
  await openInDashboardApp(dashboardLocator, {
    ...dashboardLocatorParams,
    dashboardId: savedDashboardId,
  });
};

interface ShowAttachmentParams extends Omit<ApplyAttachmentParams, 'api'> {
  /** The dashboard open in the app, if any. */
  api?: DashboardApi;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

/**
 * Shows the attachment in the Dashboard app, for a user who can write dashboards: in the open
 * dashboard when it belongs there, otherwise in its saved dashboard or a new one.
 */
export const showAttachment = async ({
  attachment,
  api,
  dashboardLocator,
  toasts,
  attachmentLinks,
  checkSavedDashboardExist,
}: ShowAttachmentParams): Promise<void> => {
  const currentDashboardId = api?.savedObjectId$.getValue();
  // also covers an unsaved dashboard showing an attachment that has no saved dashboard
  if (api && attachment.origin === currentDashboardId) {
    await applyAttachment({ attachment, api, dashboardLocator, toasts, attachmentLinks });
    return;
  }

  const originExists = attachment.origin
    ? await checkSavedDashboardExist(attachment.origin)
    : false;
  // an attachment without a saved dashboard belongs to an unsaved one, or opens in a new
  // dashboard when the open one can't be edited
  if (api && !originExists && (!currentDashboardId || !canApplyAgentChangesInPlace(api))) {
    await applyAttachment({ attachment, api, dashboardLocator, toasts, attachmentLinks });
    return;
  }

  // A host app's own `api.locator` (e.g. Security's) may keep only `dashboardId` and drop the
  // attachment's panels, so navigate through the Dashboard app locator instead.
  await openAttachmentInDashboardApp({
    attachmentId: attachment.id,
    savedDashboardId: originExists ? attachment.origin : undefined,
    dashboardLocator,
    dashboardLocatorParams: toDashboardLocatorParams(
      attachmentDataToDashboardState(attachment.data)
    ),
    attachmentLinks,
    fromApi: api,
  });
};
