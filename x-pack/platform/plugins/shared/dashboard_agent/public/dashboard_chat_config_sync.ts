/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, merge, skip, type Observable, type Subscription } from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, dashboardStateToAttachment } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { childrenUnsavedChanges$ } from '@kbn/presentation-publishing';

const DASHBOARD_CONTEXT_ATTACHMENT_ID = 'dashboard-context';

const getDashboardAttachment = (
  api: DashboardApi
): AttachmentInput<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachment['data']> | undefined => {
  const currentDashboardState = api.getSerializedState().attributes;

  if (!currentDashboardState) {
    return undefined;
  }

  return {
    id: DASHBOARD_CONTEXT_ATTACHMENT_ID,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: dashboardStateToAttachment(currentDashboardState),
    origin: api.savedObjectId$.getValue(),
  };
};

const getTrackableDashboardObservables = (api: DashboardApi): Array<Observable<unknown>> => {
  return [
    api.savedObjectId$,
    api.layout$,
    api.title$,
    api.description$,
    api.filters$,
    api.query$,
    api.timeRange$,
    api.projectRouting$,
    api.settings?.autoApplyFilters$,
    api.settings?.syncColors$,
    api.settings?.syncCursor$,
    api.settings?.syncTooltips$,
    api.settings?.useMargins$,
    api.hideTitle$,
    api.hideBorder$,
  ].filter((observable): observable is NonNullable<typeof observable> => Boolean(observable));
};

export const syncDashboardChatConfig = ({
  agentBuilder,
  dashboardPlugin,
}: {
  agentBuilder: AgentBuilderPluginStart;
  dashboardPlugin: DashboardStart;
}): (() => void) => {
  let dashboardStateSubscription: Subscription | undefined;

  const apiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
    dashboardStateSubscription?.unsubscribe();
    dashboardStateSubscription = undefined;

    if (!api) {
      agentBuilder.setChatConfig({});
      return;
    }

    const syncCurrentDashboard = () => {
      const attachment = getDashboardAttachment(api);

      agentBuilder.setChatConfig({
        newConversationAttachments: attachment ? [attachment] : undefined,
      });
    };

    syncCurrentDashboard();

    const observables = getTrackableDashboardObservables(api);
    const childrenChanges$ = childrenUnsavedChanges$(api.children$).pipe(skip(1));

    dashboardStateSubscription = merge(...observables, childrenChanges$)
      .pipe(skip(observables.length), debounceTime(150))
      .subscribe(syncCurrentDashboard);
  });

  return () => {
    apiSubscription.unsubscribe();
    dashboardStateSubscription?.unsubscribe();
    agentBuilder.clearChatConfig();
  };
};
