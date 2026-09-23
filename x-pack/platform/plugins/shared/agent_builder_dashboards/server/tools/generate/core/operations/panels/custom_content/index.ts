/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  customContentUpdateSchema,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';

/** Create schema: no template — the server generates it server-side during the tool call. */
export const customContentPanelConfigSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .describe('What to display. The HTML template is generated server-side; never supply one.'),
  esqlQuery: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .optional()
    .describe(
      'ES|QL whose rows feed the template; omit for static content. Build it with generate_esql; a rejected query fails the panel.'
    ),
});

export type CustomContentPanelConfig = z.output<typeof customContentPanelConfigSchema>;

/** Edit schema: prompt and esqlQuery only — template is generated server-side. */
const customContentEditConfigSchema = customContentUpdateSchema;

/**
 * The custom_content variant of a `config`-source panel input, discriminated by
 * `type: 'custom_content'`.
 */
export const customContentPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('custom_content'),
  grid: panelGridSchema,
  config: customContentPanelConfigSchema,
});

export const editCustomContentPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('custom_content'),
  panelId: z.string().max(256).describe('Existing custom_content panel id.'),
  config: customContentEditConfigSchema.describe(
    'Only the fields that change; the server refines the existing template from the merged prompt and esqlQuery.'
  ),
});

/** Registry entry for the `custom_content` panel type. */
export const customContentPanelDefinition = definePanelType({
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  validateConfigEdit: (existingPanel) =>
    existingPanel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE
      ? { ok: true }
      : {
          ok: false,
          error: `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited as custom content. Use source: "request" for ES|QL-backed Lens or Vega panels.`,
        },
});
