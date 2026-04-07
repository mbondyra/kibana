/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';

export interface ConversationChangedAction {
  type: 'conversation_changed';
  conversationId?: string;
  attachments?: VersionedAttachment[];
}

export interface ManualChangedAction {
  type: 'manual_changed';
  currentOrigin?: string;
  currentDashboardData?: DashboardAttachment['data'];
}

export type DashboardAttachmentStateAction = ConversationChangedAction | ManualChangedAction;
