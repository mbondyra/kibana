/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_PANEL_ATTACHMENT_TYPE } from './constants';

const MAX_ID_LENGTH = 256;
export const DASHBOARD_PANEL_LABEL_MAX_LENGTH = 512;

/** Points at one panel of a dashboard attachment; never carries the panel config. */
export const dashboardPanelAttachmentDataSchema = lazySchema(() =>
  z.object({
    dashboard_attachment_id: z.string().min(1).max(MAX_ID_LENGTH),
    panel_id: z.string().min(1).max(MAX_ID_LENGTH),
    label: z.string().max(DASHBOARD_PANEL_LABEL_MAX_LENGTH),
    panel_type: z.string().min(1).max(MAX_ID_LENGTH),
  })
);

export type DashboardPanelAttachmentData = z.infer<typeof dashboardPanelAttachmentDataSchema>;

export type DashboardPanelAttachment = Attachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

export type PendingDashboardPanelAttachment = AttachmentInput<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

/**
 * Deterministic, so re-sending a panel replaces its pointer. Includes the dashboard attachment id
 * because dashboard copies share panel ids.
 */
export const getDashboardPanelAttachmentId = ({
  dashboardAttachmentId,
  panelId,
}: {
  dashboardAttachmentId: string;
  panelId: string;
}): string => `${DASHBOARD_PANEL_ATTACHMENT_TYPE}-${dashboardAttachmentId}-${panelId}`;

export const isDashboardPanelAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
> => attachment.type === DASHBOARD_PANEL_ATTACHMENT_TYPE;
