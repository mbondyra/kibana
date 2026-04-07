/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';

export interface DashboardAttachmentStateBase {
  cleanup: () => void;
  getCurrentAttachment: () => DashboardAttachment | undefined;
}

export type DashboardAttachmentStateWithData = DashboardAttachmentStateBase & {
  attachmentId: string;
  data?: DashboardAttachment['data'];
  persistedOrigin?: string;
  localOrigin?: string;
};

export interface EmptyDashboardAttachmentState extends DashboardAttachmentStateBase {
  kind: 'empty';
}

export interface ExistingDashboardAttachmentState extends DashboardAttachmentStateWithData {
  kind: 'existing';
  conversationId: string;
}

export interface PendingDashboardAttachmentState extends DashboardAttachmentStateWithData {
  kind: 'pending';
  conversationId?: string;
  data: DashboardAttachment['data'];
}

export type DashboardAttachmentState =
  | EmptyDashboardAttachmentState
  | ExistingDashboardAttachmentState
  | PendingDashboardAttachmentState;

export const createEmptyState = (): EmptyDashboardAttachmentState => ({
  kind: 'empty',
  cleanup: () => {},
  getCurrentAttachment: () => undefined,
});

export const getAttachmentFromState = (
  state: DashboardAttachmentStateWithData
): DashboardAttachment | undefined => {
  if (!state.data) {
    return undefined;
  }

  return {
    id: state.attachmentId,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: state.data,
    origin: state.localOrigin ?? state.persistedOrigin,
  };
};
