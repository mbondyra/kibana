/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type PendingDashboardAttachment,
  dashboardStateToAttachmentData,
} from '@kbn/dashboard-agent-common';
import { v4 as uuidv4 } from 'uuid';
import {
  createEmptyState,
  getAttachmentFromState,
  type EmptyDashboardAttachmentState,
  type PendingDashboardAttachmentState,
} from './dashboard_attachment_sessions';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface ActivatePendingAttachmentStateParams {
  api: DashboardApi;
  agentBuilder: AgentBuilderPluginStart;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (attachment: PendingDashboardAttachment) => void;
}

export interface ActivatePendingAttachmentStateResult {
  attachment: PendingDashboardAttachment & {
    id: string;
    data: NonNullable<PendingDashboardAttachment['data']>;
  };
  originSyncSubscription: Subscription;
}

export interface CreatePendingAttachmentStateParams {
  api: DashboardApi;
  agentBuilder: AgentBuilderPluginStart;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  conversationId?: string;
}

export const activatePendingAttachmentState = ({
  api,
  agentBuilder,
  checkSavedDashboardExist,
  updateOrigin,
}: ActivatePendingAttachmentStateParams): ActivatePendingAttachmentStateResult | undefined => {
  const id = uuidv4();
  const initialOrigin = api.savedObjectId$.getValue();

  const data = dashboardStateToAttachmentData(api.getSerializedState().attributes);
  if (!data) {
    return undefined;
  }

  const attachment: ActivatePendingAttachmentStateResult['attachment'] = {
    type: DASHBOARD_ATTACHMENT_TYPE,
    data,
    id,
    origin: initialOrigin,
  };
  agentBuilder.addAttachment(attachment);

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    attachmentOrigin: initialOrigin,
    checkSavedDashboardExist,
    updateOrigin: (origin) => {
      const dashboardData = dashboardStateToAttachmentData(api.getSerializedState().attributes);
      if (!dashboardData) {
        return;
      }

      const updatedAttachment: PendingDashboardAttachment = {
        data: dashboardData,
        id,
        origin,
        type: DASHBOARD_ATTACHMENT_TYPE,
      };

      agentBuilder.addAttachment(updatedAttachment);
      updateOrigin(updatedAttachment);
    },
  });

  return {
    attachment,
    originSyncSubscription,
  };
};

export const createPendingAttachmentState = ({
  api,
  agentBuilder,
  checkSavedDashboardExist,
  conversationId,
}: CreatePendingAttachmentStateParams):
  | PendingDashboardAttachmentState
  | EmptyDashboardAttachmentState => {
  const pendingState = activatePendingAttachmentState({
    api,
    agentBuilder,
    checkSavedDashboardExist,
    updateOrigin: (updatedAttachment: PendingDashboardAttachment) => {
      if (updatedAttachment.data === undefined) {
        return;
      }

      state.data = updatedAttachment.data;
      state.localOrigin = updatedAttachment.origin;
    },
  });

  if (!pendingState) {
    return createEmptyState();
  }

  const state: PendingDashboardAttachmentState = {
    kind: 'pending',
    conversationId,
    attachmentId: pendingState.attachment.id,
    data: pendingState.attachment.data,
    persistedOrigin: pendingState.attachment.origin,
    localOrigin: undefined,
    cleanup: () => {
      pendingState.originSyncSubscription.unsubscribe();
    },
    getCurrentAttachment: () => getAttachmentFromState(state),
  };

  return state;
};
