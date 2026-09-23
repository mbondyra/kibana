/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';

/**
 * Adds a panel from a visualization attachment the conversation already holds. Carries no panel
 * `type`: the attachment's own renderer decides which embeddable it becomes.
 */
export const attachmentPanelInputSchema = z.object({
  source: z.literal('attachment'),
  attachment_id: z
    .string()
    .max(256)
    .describe(
      'Visualization attachment id from this conversation (a create_visualization result). Its latest version and renderer decide the panel. Prefer over source: "config".'
    ),
  grid: panelGridSchema,
});

export type AttachmentPanelInput = z.infer<typeof attachmentPanelInputSchema>;
