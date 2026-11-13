/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';

// a navigation that was cancelled, e.g. at the unsaved changes prompt, never opens the dashboard
// the link was left for, so a dashboard opened later must not take it over
export const NEXT_DASHBOARD_LINK_TTL_MS = 60000;

export interface AttachmentLinks {
  /** Links the attachment to the dashboard it was staged from or applied to. */
  link: (api: DashboardApi, attachmentId: string) => void;
  isLinked: (api: DashboardApi, attachmentId: string) => boolean;
  /** The given attachment linked last to the dashboard. */
  findLinkedAttachment: <T extends { id: string }>(
    api: DashboardApi,
    attachments: T[]
  ) => T | undefined;
  /** Links the next unsaved dashboard that opens, e.g. a new one opened with the attachment's state. */
  linkNextDashboard: (attachmentId: string, fromApi?: DashboardApi) => void;
  /** Lets a dashboard that opens take over the link `linkNextDashboard` left. */
  claimNextDashboardLink: (api: DashboardApi) => void;
}

/**
 * Which attachments each dashboard stands for, so its changes and saves go to them even before the
 * dashboard is saved and the attachment's origin points to it. Attachment ids are unique across
 * conversations, so a link from another conversation matches none of the current one's attachments.
 */
export const createAttachmentLinks = (): AttachmentLinks => {
  const linkedAttachmentIds = new WeakMap<DashboardApi, string[]>();
  let nextDashboardLink:
    | { attachmentId: string; fromApi?: DashboardApi; expiresAt: number }
    | undefined;

  const link = (api: DashboardApi, attachmentId: string) => {
    const attachmentIds = (linkedAttachmentIds.get(api) ?? []).filter((id) => id !== attachmentId);
    linkedAttachmentIds.set(api, [...attachmentIds, attachmentId]);
  };

  return {
    link,
    isLinked: (api, attachmentId) => Boolean(linkedAttachmentIds.get(api)?.includes(attachmentId)),
    findLinkedAttachment: (api, attachments) => {
      const attachmentIds = linkedAttachmentIds.get(api) ?? [];
      return attachments
        .filter(({ id }) => attachmentIds.includes(id))
        .sort((a, b) => attachmentIds.indexOf(b.id) - attachmentIds.indexOf(a.id))[0];
    },
    linkNextDashboard: (attachmentId, fromApi) => {
      nextDashboardLink = {
        attachmentId,
        fromApi,
        expiresAt: Date.now() + NEXT_DASHBOARD_LINK_TTL_MS,
      };
    },
    claimNextDashboardLink: (api) => {
      // the dashboard the link was left from is published again when the chat reopens
      if (!nextDashboardLink || nextDashboardLink.fromApi === api) {
        return;
      }
      const { attachmentId, expiresAt } = nextDashboardLink;
      nextDashboardLink = undefined;
      if (Date.now() < expiresAt && !api.savedObjectId$.getValue()) {
        link(api, attachmentId);
      }
    },
  };
};
