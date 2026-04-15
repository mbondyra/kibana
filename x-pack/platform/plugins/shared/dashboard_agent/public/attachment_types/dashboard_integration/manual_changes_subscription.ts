/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, merge, skip, type Observable, type Subscription } from 'rxjs';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { childrenUnsavedChanges$ } from '@kbn/presentation-publishing';

export interface ManualChangesSubscriptionParams {
  api: DashboardApi;
  getAttachments: () => DashboardAttachment[] | undefined;
  addAttachmentFromDashboard: (attachmentId?: string) => void;
}

/**
 * Creates a subscription that tracks manual changes to the dashboard
 * and syncs them back to the attachment.
 */
export const createManualChangesSubscription = ({
  api,
  getAttachments,
  addAttachmentFromDashboard,
}: ManualChangesSubscriptionParams): Subscription => {
  // TODO: we should get it directly from the dashboard plugin
  // Collect observables for all trackable dashboard state
  const observables: Array<Observable<unknown>> = [
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
  ].filter((o): o is NonNullable<typeof o> => Boolean(o));
  const childrenChanges$ = childrenUnsavedChanges$(api.children$).pipe(skip(1));

  return merge(...observables, childrenChanges$)
    .pipe(
      skip(observables.length), // Skip initial emissions from all BehaviorSubjects
      debounceTime(150)
    )
    .subscribe(() => {
      const dashboardId = api.savedObjectId$.getValue();
      const attachments = getAttachments();

      // Only reuse an unsaved attachment while the current dashboard is also unsaved.
      const syncAttachment = dashboardId
        ? attachments?.find(({ origin }) => origin === dashboardId)
        : attachments?.find(({ origin }) => origin === undefined);

      addAttachmentFromDashboard(syncAttachment?.id);
    });
};
