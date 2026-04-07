/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { isDashboardAttachment } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import deepEqual from 'fast-deep-equal';
import type {
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_state';
import { selectStateKey } from './dashboard_attachment_state_selectors';
import { createExistingAttachmentState } from './existing_attachment_state';
import { createPendingAttachmentState } from './pending_attachment_state';

export interface DashboardAttachmentControllerState {
  existingStates: ExistingDashboardAttachmentState[];
  pendingState?: PendingDashboardAttachmentState;
}

export interface OriginSyncDescriptor {
  key: string;
  kind: 'existing' | 'pending';
  attachmentId: string;
  conversationId?: string;
  attachmentOrigin: string | undefined;
}

export interface ReduceConversationChangeParams {
  state: DashboardAttachmentControllerState;
  conversationId?: string;
  attachments?: VersionedAttachment[];
  currentOrigin?: string;
  currentDashboardData?: DashboardAttachment['data'];
  localPendingAttachments: DashboardAttachment[];
}

export interface ReduceConversationChangeResult {
  state: DashboardAttachmentControllerState;
  originSyncDescriptors: OriginSyncDescriptor[];
  attachmentsToUpsert: DashboardAttachment[];
}

const canReuseExistingState = ({
  currentState,
  attachment,
  conversationId,
}: {
  currentState: ExistingDashboardAttachmentState;
  attachment: VersionedAttachment;
  conversationId: string;
}) =>
  currentState.conversationId === conversationId &&
  currentState.attachmentId === attachment.id &&
  currentState.persistedOrigin === attachment.origin &&
  deepEqual(currentState.data, getLatestVersion(attachment)?.data);

const canReusePendingState = ({
  currentState,
  currentOrigin,
  currentDashboardData,
}: {
  currentState: PendingDashboardAttachmentState | undefined;
  currentOrigin?: string;
  currentDashboardData?: DashboardAttachment['data'];
}) => {
  if (!currentState || !currentDashboardData) {
    return false;
  }

  return (
    deepEqual(currentState.data, currentDashboardData) &&
    (currentState.localOrigin ?? currentState.persistedOrigin) === currentOrigin
  );
};

const findPreviousExistingState = ({
  existingStates,
  attachmentId,
  conversationId,
}: {
  existingStates: ExistingDashboardAttachmentState[];
  attachmentId: string;
  conversationId: string;
}) =>
  existingStates.find(
    (currentState) =>
      currentState.conversationId === conversationId && currentState.attachmentId === attachmentId
  );

const findReusablePendingAttachment = ({
  currentOrigin,
  currentDashboardData,
  localPendingAttachments,
}: {
  currentOrigin?: string;
  currentDashboardData?: DashboardAttachment['data'];
  localPendingAttachments: DashboardAttachment[];
}):
  | (DashboardAttachment & {
      id: string;
      data: NonNullable<DashboardAttachment['data']>;
    })
  | undefined => {
  if (!currentDashboardData) {
    return undefined;
  }

  return localPendingAttachments.find(
    (
      attachment
    ): attachment is DashboardAttachment & {
      id: string;
      data: NonNullable<DashboardAttachment['data']>;
    } => attachment.origin === currentOrigin && deepEqual(attachment.data, currentDashboardData)
  );
};

export const reduceConversationChange = ({
  state,
  conversationId,
  attachments,
  currentOrigin,
  currentDashboardData,
  localPendingAttachments,
}: ReduceConversationChangeParams): ReduceConversationChangeResult => {
  const existingDashboardAttachments = attachments?.filter(isDashboardAttachment) ?? [];

  if (existingDashboardAttachments.length > 0 && conversationId) {
    const originSyncDescriptors: OriginSyncDescriptor[] = [];
    const existingStates = existingDashboardAttachments.map((attachment) => {
      const previousState = findPreviousExistingState({
        existingStates: state.existingStates,
        attachmentId: attachment.id,
        conversationId,
      });

      if (
        previousState &&
        canReuseExistingState({ currentState: previousState, attachment, conversationId })
      ) {
        return previousState;
      }

      const existingState = createExistingAttachmentState({
        conversationId,
        attachment,
        localOrigin: previousState?.localOrigin,
      });

      originSyncDescriptors.push({
        key: selectStateKey(existingState),
        kind: 'existing',
        attachmentId: attachment.id,
        conversationId,
        attachmentOrigin: attachment.origin,
      });

      return existingState;
    });

    return {
      state: {
        existingStates,
      },
      originSyncDescriptors,
      attachmentsToUpsert: [],
    };
  }

  if (
    state.pendingState &&
    canReusePendingState({
      currentState: state.pendingState,
      currentOrigin,
      currentDashboardData,
    })
  ) {
    return {
      state: {
        existingStates: [],
        pendingState: {
          ...state.pendingState,
          conversationId,
        },
      },
      originSyncDescriptors: [],
      attachmentsToUpsert: [],
    };
  }

  const reusablePendingAttachment = findReusablePendingAttachment({
    currentOrigin,
    currentDashboardData,
    localPendingAttachments,
  });

  const { state: pendingState, attachmentToUpsert } = createPendingAttachmentState({
    conversationId,
    currentDashboardData,
    currentOrigin,
    reusableAttachment: reusablePendingAttachment,
  });

  return {
    state: {
      existingStates: [],
      pendingState: pendingState.kind === 'empty' ? undefined : pendingState,
    },
    originSyncDescriptors:
      pendingState.kind === 'empty'
        ? []
        : [
            {
              key: selectStateKey(pendingState),
              kind: 'pending',
              attachmentId: pendingState.attachmentId,
              attachmentOrigin: pendingState.localOrigin ?? pendingState.persistedOrigin,
            },
          ],
    attachmentsToUpsert: attachmentToUpsert ? [attachmentToUpsert] : [],
  };
};
