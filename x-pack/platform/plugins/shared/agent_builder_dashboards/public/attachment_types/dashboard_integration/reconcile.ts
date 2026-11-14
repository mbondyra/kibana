/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';

export type StagingAction = { type: 'unstage' } | { type: 'stage'; attachmentId: string };

/**
 * The attachment the open dashboard stands for: the one linked to it last, or the one whose origin
 * is the dashboard, which for an unsaved dashboard is one without an origin.
 */
export const findDashboardAttachment = ({
  attachments,
  dashboardId,
  findLinkedAttachment,
}: {
  attachments: DashboardAttachment[];
  /** The saved id of the dashboard, `undefined` for an unsaved one. */
  dashboardId: string | undefined;
  findLinkedAttachment: (attachments: DashboardAttachment[]) => DashboardAttachment | undefined;
}): DashboardAttachment | undefined =>
  findLinkedAttachment(attachments) ?? attachments.find(({ origin }) => origin === dashboardId);

/**
 * The chat input stages the open dashboard unless the dashboard shows its attachment's latest
 * version, so the agent always sees what the user sees. A dashboard without an attachment is
 * staged as a new one.
 */
export const reconcileStaging = ({
  dashboardAttachmentId,
  isShown,
  draftAttachmentId,
}: {
  dashboardAttachmentId: string | undefined;
  /** Whether the open dashboard shows the latest version of its attachment. */
  isShown: boolean;
  draftAttachmentId: string;
}): StagingAction =>
  dashboardAttachmentId && isShown
    ? { type: 'unstage' }
    : { type: 'stage', attachmentId: dashboardAttachmentId ?? draftAttachmentId };

/**
 * Whether an agent update belongs to the open dashboard: an unsaved dashboard takes every update,
 * a saved one those of its attachment, which may not have its origin yet.
 */
export const isOpenDashboardUpdate = ({
  attachment: { id, origin },
  dashboardId,
  isLinked,
}: {
  attachment: DashboardAttachment;
  dashboardId: string | undefined;
  isLinked: (attachmentId: string) => boolean;
}): boolean => !dashboardId || origin === dashboardId || (!origin && isLinked(id));
