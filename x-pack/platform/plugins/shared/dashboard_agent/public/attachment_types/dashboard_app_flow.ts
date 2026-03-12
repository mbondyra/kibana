/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { openConfirmApplyDifferentDashboardModal } from './confirm_apply_different_dashboard_modal';
import { getStateFromAttachment } from './attachment_to_dashboard_state';

interface RunDashboardAppFlowParams {
  attachment: DashboardAttachment;
  core: CoreStart;
  dashboardApi: DashboardApi;
  confirmedOverwriteForIdState: [string | undefined, (savedObjectId: string | undefined) => void];
}

export const runDashboardAppFlow = ({
  attachment,
  core,
  dashboardApi,
  confirmedOverwriteForIdState,
}: RunDashboardAppFlowParams) => {
  const [confirmedOverwriteForId, setConfirmedOverwriteForId] = confirmedOverwriteForIdState;
  const dashboardState = getStateFromAttachment(attachment);
  const savedObjectId = attachment.origin?.savedObjectId;
  const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();
  const hasConfirmedForCurrentDashboard = confirmedOverwriteForId === currentSavedObjectId;

  const applyAttachmentChanges = () => {
    dashboardApi.setViewMode('edit');
    (
      dashboardApi as DashboardApi & {
        setState: (state: typeof dashboardState) => void;
      }
    ).setState(dashboardState);
  };

  if (savedObjectId !== currentSavedObjectId && !hasConfirmedForCurrentDashboard) {
    openConfirmApplyDifferentDashboardModal({
      core,
      onApply: () => {
        setConfirmedOverwriteForId(currentSavedObjectId);
        applyAttachmentChanges();
      },
    });
    return;
  }

  applyAttachmentChanges();
};
