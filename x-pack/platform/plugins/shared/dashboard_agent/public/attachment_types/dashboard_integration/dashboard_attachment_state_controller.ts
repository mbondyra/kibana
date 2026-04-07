/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
  isDashboardAttachment,
} from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import deepEqual from 'fast-deep-equal';
import type { Subscription } from 'rxjs';
import type {
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_state';
import {
  selectAttachmentsFromStates,
  selectStateKey,
} from './dashboard_attachment_state_selectors';
import { createExistingAttachmentState } from './existing_attachment_state';
import { createPendingAttachmentState } from './pending_attachment_state';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { selectDashboardAttachmentForSync } from './select_dashboard_attachment_for_sync';

export interface DashboardAttachmentStateController {
  getAttachments: () => DashboardAttachment[];
  getSyncAttachment: (currentSavedObjectId: string | undefined) => DashboardAttachment | undefined;
  upsertLocalAttachment: (attachment: DashboardAttachment) => void;
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
  type ManagedDashboardAttachmentState =
    | ExistingDashboardAttachmentState
    | PendingDashboardAttachmentState;
  interface OriginSyncConfig {
    key: string;
    attachmentOrigin: string | undefined;
    updateOrigin: (origin: string) => void;
  }

  let state: {
    existingStates: ExistingDashboardAttachmentState[];
    pendingState?: PendingDashboardAttachmentState;
  } = {
    existingStates: [],
  };
  const localPendingAttachments = new Map<string, DashboardAttachment>();
  const originSyncSubscriptions = new Map<
    string,
    {
      attachmentOrigin: string | undefined;
      subscription: Subscription;
    }
  >();

  const getStates = (currentState: typeof state = state): ManagedDashboardAttachmentState[] =>
    currentState.pendingState
      ? [...currentState.existingStates, currentState.pendingState]
      : [...currentState.existingStates];

  const replaceState = (nextState: typeof state, originSyncConfigs: OriginSyncConfig[] = []) => {
    const currentStates = getStates();
    const nextStates = getStates(nextState);
    const nextStateKeys = new Set(nextStates.map(selectStateKey));

    for (const currentState of currentStates) {
      const currentStateKey = selectStateKey(currentState);
      if (!nextStateKeys.has(currentStateKey)) {
        originSyncSubscriptions.get(currentStateKey)?.subscription.unsubscribe();
        originSyncSubscriptions.delete(currentStateKey);
      }
    }

    for (const { key, attachmentOrigin, updateOrigin } of originSyncConfigs) {
      const existingSubscription = originSyncSubscriptions.get(key);
      if (
        existingSubscription !== undefined &&
        existingSubscription.attachmentOrigin === attachmentOrigin
      ) {
        continue;
      }

      existingSubscription?.subscription.unsubscribe();
      originSyncSubscriptions.set(key, {
        attachmentOrigin,
        subscription: createOriginSyncSubscription({
          api,
          attachmentOrigin,
          checkSavedDashboardExist,
          updateOrigin,
        }),
      });
    }

    state = nextState;
  };

  const getAttachments = (): DashboardAttachment[] => selectAttachmentsFromStates(getStates());

  const trackLocalAttachment = (attachment: DashboardAttachment) => {
    localPendingAttachments.set(attachment.id, attachment);

    if (state.pendingState?.attachmentId === attachment.id) {
      state.pendingState.data = attachment.data;
      state.pendingState.localOrigin = attachment.origin;
    }
  };

  const upsertLocalAttachment = (attachment: DashboardAttachment) => {
    agentBuilder.addAttachment(attachment);
    trackLocalAttachment(attachment);
  };

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
      const originSyncConfigs: OriginSyncConfig[] = [];
      replaceState(
        {
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

            const existingState = createExistingAttachmentState({
              conversationId,
              attachment,
              localOrigin: previousState ? previousState.localOrigin : undefined,
            });

            originSyncConfigs.push({
              key: selectStateKey(existingState),
              attachmentOrigin: attachment.origin,
              updateOrigin: (origin) => {
                agentBuilder.updateAttachmentOrigin(conversationId, attachment.id, origin);
                existingState.localOrigin = origin;
              },
            });

            return existingState;
          }),
        },
        originSyncConfigs
      );

      return;
    }

    const previousPendingState = state.pendingState;
    const currentOrigin = api.savedObjectId$.getValue();

    if (
      previousPendingState &&
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
      conversationId,
      reusableAttachment: reusablePendingAttachment,
      upsertLocalAttachment,
    });

    replaceState(
      {
        existingStates: [],
        pendingState: pendingState.kind === 'empty' ? undefined : pendingState,
      },
      pendingState.kind === 'empty'
        ? []
        : [
            {
              key: selectStateKey(pendingState),
              attachmentOrigin: pendingState.localOrigin ?? pendingState.persistedOrigin,
              updateOrigin: (origin) => {
                if (!pendingState.data) {
                  return;
                }

                const updatedAttachment: DashboardAttachment = {
                  data: pendingState.data,
                  id: pendingState.attachmentId,
                  origin,
                  type: DASHBOARD_ATTACHMENT_TYPE,
                };

                upsertLocalAttachment(updatedAttachment);
              },
            },
          ]
    );
  };

  const cleanup = () => {
    localPendingAttachments.clear();
    originSyncSubscriptions.forEach(({ subscription }) => subscription.unsubscribe());
    originSyncSubscriptions.clear();
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
    upsertLocalAttachment,
    handleConversationChange,
    cleanup,
  };
};
