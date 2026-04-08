/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type {
  DashboardAttachmentState,
  DashboardAttachmentStateWithData,
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_state';

export const selectAttachmentFromState = (
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

export const selectAttachments = (
  states: readonly DashboardAttachmentState[]
): DashboardAttachment[] =>
  states.flatMap((state) => {
    if (state.kind === 'empty') {
      return [];
    }

    const attachment = selectAttachmentFromState(state);
    return attachment ? [attachment] : [];
  });

export const selectStateKey = (
  state: ExistingDashboardAttachmentState | PendingDashboardAttachmentState
): string =>
  state.kind === 'existing'
    ? `existing:${state.conversationId}:${state.attachmentId}`
    : `pending:${state.attachmentId}`;
