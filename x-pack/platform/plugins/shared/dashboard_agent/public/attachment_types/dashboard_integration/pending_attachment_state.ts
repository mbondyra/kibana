/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { v4 as uuidv4 } from 'uuid';
import {
  createEmptyState,
  type EmptyDashboardAttachmentState,
  type PendingDashboardAttachmentState,
} from './dashboard_attachment_state';

export interface CreatePendingAttachmentStateParams {
  api: DashboardApi;
  conversationId?: string;
  reusableAttachment?: DashboardAttachment & {
    id: string;
    data: NonNullable<DashboardAttachment['data']>;
  };
  upsertLocalAttachment: (attachment: DashboardAttachment) => void;
}

export const createPendingAttachmentState = ({
  api,
  conversationId,
  reusableAttachment,
  upsertLocalAttachment,
}: CreatePendingAttachmentStateParams):
  | PendingDashboardAttachmentState
  | EmptyDashboardAttachmentState => {
  const initialOrigin = api.savedObjectId$.getValue();
  const data = dashboardStateToAttachmentData(api.getSerializedState().attributes);
  if (!data) {
    return createEmptyState();
  }

  const attachment = reusableAttachment ?? {
    type: DASHBOARD_ATTACHMENT_TYPE,
    data,
    id: uuidv4(),
    origin: initialOrigin,
  };

  if (!reusableAttachment) {
    upsertLocalAttachment(attachment);
  }

  return {
    kind: 'pending',
    conversationId,
    attachmentId: attachment.id,
    data: attachment.data,
    persistedOrigin: attachment.origin,
    localOrigin: undefined,
  };
};
