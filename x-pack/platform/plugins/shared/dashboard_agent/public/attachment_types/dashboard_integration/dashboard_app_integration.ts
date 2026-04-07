/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createDashboardAttachmentStateController } from './dashboard_attachment_state_controller';
import { createManualChangesSubscription } from './manual_changes_subscription';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  checkSavedDashboardExist,
}: DashboardAppIntegrationParams): (() => void) => {
  const stateController = createDashboardAttachmentStateController({
    api,
    agentBuilder,
    checkSavedDashboardExist,
  });
  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
  });
  const manualChangesSubscription = createManualChangesSubscription({
    agentBuilder,
    api,
    getSyncAttachment: stateController.getSyncAttachment,
    onAttachmentUpsert: stateController.handleLocalAttachmentUpsert,
  });
  const unsubscribeConversationChanges = agentBuilder.subscribeToConversationChanges(
    ({ id: conversationId, attachments }) => {
      stateController.handleConversationChange({ conversationId, attachments });
    }
  );

  return () => {
    stateController.cleanup();
    agentLiveUpdatesSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    unsubscribeConversationChanges();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));
