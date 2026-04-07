/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';

export interface DashboardAttachmentStateBase {
  kind: string;
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
});
