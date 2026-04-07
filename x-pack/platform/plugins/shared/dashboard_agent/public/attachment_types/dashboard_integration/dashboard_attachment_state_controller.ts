/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { dashboardStateToAttachmentData, isDashboardAttachment } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import deepEqual from 'fast-deep-equal';
import type {
  DashboardAttachmentState,
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_sessions';
import { createExistingAttachmentState } from './existing_attachment_state';
import { createPendingAttachmentState } from './pending_attachment_state';
import { selectDashboardAttachmentForSync } from './select_dashboard_attachment_for_sync';

export interface DashboardAttachmentStateController {
  getAttachments: () => DashboardAttachment[];
  getSyncAttachment: (currentSavedObjectId: string | undefined) => DashboardAttachment | undefined;
  handleLocalAttachmentUpsert: (attachment: DashboardAttachment) => void;
  handleConversationChange: (params: {
    conversationId?: string;
    attachments?: VersionedAttachment[];
  }) => void;
  cleanup: () => void;
}

export const createDashboardAttachmentStateController = ({
  api,
  agentBuilder,
  checkSavedDashboardExist,
}: {
  api: DashboardApi;
  agentBuilder: AgentBuilderPluginStart;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}): DashboardAttachmentStateController => {
  let state: {
    existingStates: ExistingDashboardAttachmentState[];
    pendingState?: PendingDashboardAttachmentState;
  } = {
    existingStates: [],
  };
  const localPendingAttachments = new Map<string, DashboardAttachment>();

  const getStates = (): DashboardAttachmentState[] => {
    return state.pendingState
      ? [...state.existingStates, state.pendingState]
      : [...state.existingStates];
  };

  const replaceState = (nextState: typeof state) => {
    const currentStates = getStates();
    const nextStates: DashboardAttachmentState[] = nextState.pendingState
      ? [...nextState.existingStates, nextState.pendingState]
      : [...nextState.existingStates];
    const nextStateSet = new Set(nextStates);

    currentStates.forEach((currentState) => {
      if (!nextStateSet.has(currentState)) {
        currentState.cleanup();
      }
    });

    state = nextState;
  };

  const getAttachments = (): DashboardAttachment[] => {
    return getStates().flatMap((currentState) => {
      const attachment = currentState.getCurrentAttachment();
      return attachment ? [attachment] : [];
    });
  };

  const handleLocalAttachmentUpsert = (attachment: DashboardAttachment) => {
    localPendingAttachments.set(attachment.id, attachment);

    if (state.pendingState?.attachmentId === attachment.id) {
      state.pendingState.data = attachment.data;
      state.pendingState.localOrigin = attachment.origin;
    }
  };

  const canReuseExistingState = ({
    currentState,
    attachment,
    conversationId,
  }: {
    currentState: DashboardAttachmentState;
    attachment: VersionedAttachment;
    conversationId: string;
  }) =>
    currentState.kind === 'existing' &&
    currentState.conversationId === conversationId &&
    currentState.attachmentId === attachment.id &&
    currentState.persistedOrigin === attachment.origin &&
    deepEqual(currentState.data, getLatestVersion(attachment)?.data);

  const findPreviousState = ({
    attachmentId,
    conversationId,
  }: {
    attachmentId: string;
    conversationId: string;
  }) =>
    state.existingStates.find(
      (currentState) =>
        currentState.conversationId === conversationId && currentState.attachmentId === attachmentId
    );

  const canReusePendingState = ({
    currentState,
    origin,
  }: {
    currentState: PendingDashboardAttachmentState | undefined;
    origin?: string;
  }) => {
    if (!currentState) {
      return false;
    }

    const currentDashboardData = dashboardStateToAttachmentData(
      api.getSerializedState().attributes
    );
    if (!currentDashboardData) {
      return false;
    }

    return (
      deepEqual(currentState.data, currentDashboardData) &&
      (currentState.localOrigin ?? currentState.persistedOrigin) === origin
    );
  };

  const findReusablePendingAttachment = ({
    origin,
  }: {
    origin?: string;
  }):
    | (DashboardAttachment & {
        id: string;
        data: NonNullable<DashboardAttachment['data']>;
      })
    | undefined => {
    const currentDashboardData = dashboardStateToAttachmentData(
      api.getSerializedState().attributes
    );
    if (!currentDashboardData) {
      return undefined;
    }

    return Array.from(localPendingAttachments.values()).find(
      (
        attachment
      ): attachment is DashboardAttachment & {
        id: string;
        data: NonNullable<DashboardAttachment['data']>;
      } => attachment.origin === origin && deepEqual(attachment.data, currentDashboardData)
    );
  };

  const handleConversationChange = ({
    conversationId,
    attachments,
  }: {
    conversationId?: string;
    attachments?: VersionedAttachment[];
  }) => {
    const existingDashboardAttachments = attachments?.filter(isDashboardAttachment) ?? [];

    if (existingDashboardAttachments.length > 0 && conversationId) {
      replaceState({
        existingStates: existingDashboardAttachments.map((attachment) => {
          const previousState = findPreviousState({
            attachmentId: attachment.id,
            conversationId,
          });

          if (
            previousState &&
            canReuseExistingState({ currentState: previousState, attachment, conversationId })
          ) {
            return previousState;
          }

          return createExistingAttachmentState({
            api,
            agentBuilder,
            checkSavedDashboardExist,
            conversationId,
            attachment,
            localOrigin: previousState ? previousState.localOrigin : undefined,
          });
        }),
      });

      return;
    }

    const previousPendingState = state.pendingState;
    const currentOrigin = api.savedObjectId$.getValue();

    if (
      canReusePendingState({
        currentState: previousPendingState,
        origin: currentOrigin,
      })
    ) {
      previousPendingState.conversationId = conversationId;
      replaceState({
        existingStates: [],
        pendingState: previousPendingState,
      });

      return;
    }

    const reusablePendingAttachment = findReusablePendingAttachment({
      origin: currentOrigin,
    });

    const pendingState = createPendingAttachmentState({
      api,
      agentBuilder,
      checkSavedDashboardExist,
      conversationId,
      reusableAttachment: reusablePendingAttachment,
      onAttachmentUpsert: handleLocalAttachmentUpsert,
    });

    replaceState({
      existingStates: [],
      pendingState: pendingState.kind === 'empty' ? undefined : pendingState,
    });
  };

  const cleanup = () => {
    localPendingAttachments.clear();
    replaceState({
      existingStates: [],
    });
  };

  return {
    getAttachments,
    getSyncAttachment: (currentSavedObjectId: string | undefined) =>
      selectDashboardAttachmentForSync({
        attachments: getAttachments(),
        currentSavedObjectId,
      }),
    handleLocalAttachmentUpsert,
    handleConversationChange,
    cleanup,
  };
};
