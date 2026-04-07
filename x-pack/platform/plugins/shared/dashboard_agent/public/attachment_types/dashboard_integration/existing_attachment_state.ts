/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  getAttachmentFromState,
  type ExistingDashboardAttachmentState,
} from './dashboard_attachment_sessions';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface CreateExistingAttachmentStateParams {
  api: DashboardApi;
  agentBuilder: AgentBuilderPluginStart;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  conversationId: string;
  attachment: VersionedAttachment;
  localOrigin?: string;
}

export const createExistingAttachmentState = ({
  api,
  agentBuilder,
  checkSavedDashboardExist,
  conversationId,
  attachment,
  localOrigin,
}: CreateExistingAttachmentStateParams): ExistingDashboardAttachmentState => {
  const state: ExistingDashboardAttachmentState = {
    kind: 'existing',
    conversationId,
    attachmentId: attachment.id,
    data: getLatestVersion(attachment)?.data as ExistingDashboardAttachmentState['data'],
    persistedOrigin: attachment.origin,
    localOrigin,
    cleanup: () => {
      originSyncSubscription.unsubscribe();
    },
    getCurrentAttachment: () => getAttachmentFromState(state),
  };

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    attachmentOrigin: attachment.origin,
    checkSavedDashboardExist,
    updateOrigin: (origin) => {
      agentBuilder.updateAttachmentOrigin(conversationId, attachment.id, origin);
      state.localOrigin = origin;
    },
  });

  return state;
};
