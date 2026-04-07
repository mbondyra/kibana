/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { v4 as uuidv4 } from 'uuid';
import {
  createEmptyState,
  type EmptyDashboardAttachmentState,
  type PendingDashboardAttachmentState,
} from './dashboard_attachment_state';

export interface CreatePendingAttachmentStateParams {
  conversationId?: string;
  currentDashboardData?: DashboardAttachment['data'];
  currentOrigin?: string;
  reusableAttachment?: DashboardAttachment & {
    id: string;
    data: NonNullable<DashboardAttachment['data']>;
  };
}

export interface CreatePendingAttachmentStateResult {
  state: PendingDashboardAttachmentState | EmptyDashboardAttachmentState;
  attachmentToUpsert?: DashboardAttachment;
}

export const createPendingAttachmentState = ({
  conversationId,
  currentDashboardData,
  currentOrigin,
  reusableAttachment,
}: CreatePendingAttachmentStateParams): CreatePendingAttachmentStateResult => {
  if (!currentDashboardData) {
    return {
      state: createEmptyState(),
    };
  }

  const attachment = reusableAttachment ?? {
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: currentDashboardData,
    id: uuidv4(),
    origin: currentOrigin,
  };

  return {
    state: {
      kind: 'pending',
      conversationId,
      attachmentId: attachment.id,
      data: attachment.data,
      persistedOrigin: attachment.origin,
      localOrigin: undefined,
    },
    attachmentToUpsert: reusableAttachment ? undefined : attachment,
  };
};
