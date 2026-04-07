/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { Subscription } from 'rxjs';
import type { DashboardAttachmentStateAction } from './dashboard_attachment_state_actions';
import type {
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_state';
import {
  type DashboardAttachmentReducerContext,
  type DashboardAttachmentControllerState,
  reduceDashboardAttachmentState,
} from './dashboard_attachment_state_reducer';
import {
  selectAttachmentsFromStates,
  selectStateKey,
} from './dashboard_attachment_state_selectors';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAttachmentStateController {
  getAttachments: () => DashboardAttachment[];
  dispatch: (action: DashboardAttachmentStateAction) => void;
  upsertLocalAttachment: (attachment: DashboardAttachment) => void;
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

  let state: DashboardAttachmentControllerState = {
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

  const updateExistingStateLocalOrigin = ({
    conversationId,
    attachmentId,
    origin,
  }: {
    conversationId: string;
    attachmentId: string;
    origin: string;
  }) => {
    const existingState = state.existingStates.find(
      (currentState) =>
        currentState.conversationId === conversationId && currentState.attachmentId === attachmentId
    );

    if (existingState) {
      existingState.localOrigin = origin;
    }
  };

  const applyReducerResult = (nextState: ReturnType<typeof reduceDashboardAttachmentState>) => {
    nextState.attachmentsToUpsert.forEach((attachment) => {
      upsertLocalAttachment(attachment);
    });

    replaceState(
      nextState.state,
      nextState.originSyncDescriptors.map((descriptor) => ({
        key: descriptor.key,
        attachmentOrigin: descriptor.attachmentOrigin,
        updateOrigin: (origin) => {
          if (descriptor.kind === 'existing' && descriptor.conversationId) {
            agentBuilder.updateAttachmentOrigin(
              descriptor.conversationId,
              descriptor.attachmentId,
              origin
            );
            updateExistingStateLocalOrigin({
              conversationId: descriptor.conversationId,
              attachmentId: descriptor.attachmentId,
              origin,
            });
            return;
          }

          const pendingState = state.pendingState;
          if (!pendingState || pendingState.attachmentId !== descriptor.attachmentId) {
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
      }))
    );
  };

  const dispatch = (action: DashboardAttachmentStateAction) => {
    const context: DashboardAttachmentReducerContext = {
      currentOrigin: api.savedObjectId$.getValue(),
      currentDashboardData: dashboardStateToAttachmentData(api.getSerializedState().attributes),
      localPendingAttachments: Array.from(localPendingAttachments.values()),
    };
    const nextState = reduceDashboardAttachmentState({
      state,
      action,
      context,
    });

    applyReducerResult(nextState);
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
    dispatch,
    upsertLocalAttachment,
    cleanup,
  };
};
