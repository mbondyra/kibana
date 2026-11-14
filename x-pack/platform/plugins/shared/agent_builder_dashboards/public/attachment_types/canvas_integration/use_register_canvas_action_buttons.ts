/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import useLatest from 'react-use/lib/useLatest';
import { openAttachmentInDashboardApp } from '../dashboard_integration/show_attachment';
import type { AttachmentLinks } from '../dashboard_integration/attachment_links';

export type SavedObjectStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; exists: boolean };

interface UseRegisterCanvasActionButtonsParams {
  attachmentId: string;
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  dashboardLocatorParams: DashboardLocatorParams;
  getExistingDashboardId: () => string | undefined;
  closeCanvas: () => void;
  openSidebarConversation?: () => void;
  canWriteDashboards: boolean;
  attachmentLinks: AttachmentLinks;
}

export const useRegisterCanvasActionButtons = ({
  attachmentId,
  dashboardApi,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
  openSidebarConversation,
  canWriteDashboards,
  dashboardLocatorParams,
  getExistingDashboardId,
  attachmentLinks,
}: UseRegisterCanvasActionButtonsParams) => {
  const dashboardLocatorParamsRef = useLatest(dashboardLocatorParams);
  const getExistingDashboardIdRef = useLatest(getExistingDashboardId);
  const openSidebarConversationRef = useLatest(openSidebarConversation);

  const missingDashboardWriteControlsReason = i18n.translate(
    'xpack.agentBuilderDashboards.attachments.dashboard.canvasWriteControlsDisabledReason',
    {
      defaultMessage: 'You need dashboard write permissions to edit or save dashboards.',
    }
  );
  const managedDashboardDisabledReason = i18n.translate(
    'xpack.agentBuilderDashboards.attachments.dashboard.canvasManagedDashboardDisabledReason',
    {
      defaultMessage: 'Managed dashboards are read-only.',
    }
  );
  const readOnlyDashboardDisabledReason = i18n.translate(
    'xpack.agentBuilderDashboards.attachments.dashboard.canvasReadOnlyDashboardDisabledReason',
    {
      defaultMessage: 'You do not have permission to edit this dashboard.',
    }
  );

  useEffect(() => {
    if (!dashboardApi) {
      registerActionButtons([]);
      return;
    }

    const isLinkedSavedDashboard = getExistingDashboardIdRef.current?.() !== undefined;
    const isManagedLinkedDashboard = isLinkedSavedDashboard && dashboardApi.isManaged;
    const isReadOnlyLinkedDashboard = isLinkedSavedDashboard && !dashboardApi.isEditableByUser;

    let disabledReason: string | undefined;
    if (!canWriteDashboards) {
      disabledReason = missingDashboardWriteControlsReason;
    } else if (isManagedLinkedDashboard) {
      disabledReason = managedDashboardDisabledReason;
    } else if (isReadOnlyLinkedDashboard) {
      disabledReason = readOnlyDashboardDisabledReason;
    }

    const isWriteActionDisabled = disabledReason !== undefined;

    const buttons: ActionButton[] = [];

    if (dashboardApi.locator) {
      const { locator } = dashboardApi;
      buttons.push({
        label: i18n.translate(
          'xpack.agentBuilderDashboards.attachments.dashboard.canvasEditActionLabel',
          {
            defaultMessage: 'Edit in Dashboard',
          }
        ),
        type: ActionButtonType.PRIMARY,
        disabled: isWriteActionDisabled,
        disabledReason,
        handler: async () => {
          if (isWriteActionDisabled) {
            return;
          }
          await openAttachmentInDashboardApp({
            attachmentId,
            savedDashboardId: getExistingDashboardIdRef.current(),
            dashboardLocator: locator,
            dashboardLocatorParams: dashboardLocatorParamsRef.current,
            attachmentLinks,
          });
          closeCanvas();
          openSidebarConversationRef.current?.();
        },
      });
    }
    buttons.push({
      label: i18n.translate(
        'xpack.agentBuilderDashboards.attachments.dashboard.canvasSaveActionLabel',
        {
          defaultMessage: 'Save',
        }
      ),
      icon: 'save',
      type: ActionButtonType.SECONDARY,
      disabled: isWriteActionDisabled,
      disabledReason,
      handler: async () => {
        if (isWriteActionDisabled) {
          return;
        }
        const existingAttachmentOrigin = getExistingDashboardIdRef.current();
        if (existingAttachmentOrigin) {
          await dashboardApi.runQuickSave();
          await updateOrigin(existingAttachmentOrigin);
          return;
        }
        const result = await dashboardApi.runInteractiveSave();
        if (result?.id) {
          await updateOrigin(result.id);
        }
      },
    });
    registerActionButtons(buttons);
  }, [
    attachmentId,
    attachmentLinks,
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    closeCanvas,
    openSidebarConversationRef,
    dashboardLocatorParamsRef,
    getExistingDashboardIdRef,
    canWriteDashboards,
    missingDashboardWriteControlsReason,
    managedDashboardDisabledReason,
    readOnlyDashboardDisabledReason,
  ]);
};
