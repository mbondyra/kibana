/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import {
  isDashboardAttachment,
  dashboardStateToAttachmentData,
  DASHBOARD_ATTACHMENT_TYPE,
} from '@kbn/dashboard-agent-common';
import { v4 as uuidv4 } from 'uuid';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createManualChangesSubscription } from './manual_changes_subscription';
import { createNewAttachmentIdRegenerationSubscription } from './new_attachment_id_regeneration_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

// TODO: when should this be regenerated? when the attachment is added to the conversation?
export interface IdGenerator {
  readonly current: string;
  next: () => string;
}

const createIdGenerator = (): IdGenerator => {
  let id = uuidv4();
  return {
    get current() {
      return id;
    },
    next() {
      id = uuidv4();
      return id;
    },
  };
};

const newAttachmentStableId = createIdGenerator();

interface State {
  attachments: DashboardAttachment[] | undefined;
  conversationId: string | undefined;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  checkSavedDashboardExist,
}: DashboardAppIntegrationParams): (() => void) => {
  const state: State = {
    attachments: undefined,
    conversationId: undefined,
  };
  const setState = (newState: Partial<State>) => {
    Object.assign(state, newState);
  };

  const getAttachments = (): undefined | DashboardAttachment[] => state.attachments;

  const addAttachmentFromDashboard = (attachmentId?: string) => {
    const currentSavedObjectId = api.savedObjectId$.getValue();
    // When we already have an attachment id, keep updating that attachment.
    // Otherwise, create a fresh attachment only for a new conversation or when
    // the current dashboard is a different saved dashboard with no attachment yet.
    if (attachmentId || !state.conversationId) {
      agentBuilder.addAttachment({
        id: attachmentId ?? newAttachmentStableId.current,
        origin: currentSavedObjectId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardStateToAttachmentData(api.getSerializedState().attributes),
      });
    }
  };

  // when agent creates a new version of dashboard, update the dashboard app to this new state
  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
  });

  // Keep one stable id for the current draft attachment, then rotate it once that draft
  // has been created in the conversation so future edits do not target the committed attachment
  const newAttachmentIdRegenerationSubscription = createNewAttachmentIdRegenerationSubscription({
    agentBuilder,
    newAttachmentStableId,
  });

  // keep the attachment's origin in sync with the dashboard's saved object id on dashboard save, so that the attachment always points to the correct dashboard even after saving to a new dashboard or saving an unsaved dashboard
  const originSyncSubscription = createOriginSyncSubscription({
    api,
    checkSavedDashboardExist,
    getAttachments,
    updateOrigin: (id: string, origin: string) =>
      state.conversationId
        ? agentBuilder.updateAttachmentOrigin(state.conversationId, id, origin)
        : undefined,
  });

  // when the dashboard state is manually changed, update the attachment with the new state so that it is up to date when the user tries to share or save the conversation
  const manualChangesSubscription = createManualChangesSubscription({
    api,
    getAttachments,
    addAttachmentFromDashboard,
  });

  const unsubscribeConversationChanges = agentBuilder.subscribeToConversationChanges(
    ({ id: conversationId, attachments }) => {
      const dashboardAttachments = attachments
        ?.filter(isDashboardAttachment)
        .flatMap((attachment): DashboardAttachment[] => {
          const latestVersionData = getLatestVersion(attachment)?.data;

          return latestVersionData
            ? [
                {
                  id: attachment.id,
                  type: attachment.type,
                  data: latestVersionData,
                  origin: attachment.origin,
                },
              ]
            : [];
        });

      setState({
        attachments: dashboardAttachments,
        conversationId,
      });
      // if the conversation id is new, attach it the dashboard attachment to the conversation immediately
      addAttachmentFromDashboard();
    }
  );

  return () => {
    agentLiveUpdatesSubscription.unsubscribe();
    newAttachmentIdRegenerationSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    unsubscribeConversationChanges();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));
