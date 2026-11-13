/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';

/*
 * keep the attachment's origin in sync with the dashboard's saved object id on dashboard save,
 * so that the attachment always points to the correct dashboard even after saving to a new dashboard
 * or saving an unsaved dashboard
 */
export const createOriginSyncSubscription = ({
  api,
  getAttachments,
  findLinkedAttachment,
  updateOrigin,
}: {
  api: DashboardApi;
  getAttachments: () => undefined | DashboardAttachment[];
  findLinkedAttachment: (attachments: DashboardAttachment[]) => DashboardAttachment | undefined;
  updateOrigin: (
    attachmentId: string,
    origin: string
  ) => Promise<UpdateOriginResponse | undefined> | undefined;
}): Subscription => {
  return api.onSave$.subscribe(({ previousDashboardId, dashboardId }: DashboardSaveEvent) => {
    if (!dashboardId) {
      return;
    }
    const attachments = getAttachments();
    if (!attachments) {
      return;
    }
    const attachmentToSync =
      findLinkedAttachment(attachments) ??
      attachments.find(({ origin }) => origin === previousDashboardId || origin === dashboardId);
    if (attachmentToSync) {
      return updateOrigin(attachmentToSync.id, dashboardId);
    }
  });
};
