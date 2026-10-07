/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../resolve_panel';
import { defineConfigPanelKind } from '../panel_kind';

/**
 * Lens panels authored directly by the caller.
 *
 * `source: 'config'` (`type: 'lens'`) carries a complete Lens API config and the ES|QL query that
 * backs it. Unlike other by-value kinds, the config is not stored as given: the host validates the
 * query and the config and pins the query to every data source, through the same
 * `ResolvePanelContent` contract that resolves generated panels.
 */

/** Request to validate a Lens config the caller authored. */
export interface AuthoredLensPanelResolutionRequest extends PanelResolutionRequestBase {
  renderer: 'lens';
  authored: {
    /** Lens API config; its `type` is the chart type. Data sources are pinned by the host. */
    config: AttachmentPanel['config'];
    /** ES|QL query backing the config. On edits, omitted to keep the existing query. */
    esql?: string;
  };
}

const lensConfigSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Complete Lens API config. `type` is the chart type (e.g. "xy", "metric"). Bind result columns of `esql` with `{ column: "<name>" }`. Omit `data_source`: the query is attached to every data source.'
  );

const esqlSchema = z.string().min(1).max(4096);

export const lensPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('lens'),
  grid: panelGridSchema,
  esql: esqlSchema.describe(
    'ES|QL query backing the chart, as returned by the panel ES|QL generation tool. Never write or change it yourself. It must run, and return every column the config binds.'
  ),
  config: lensConfigSchema,
});

export const editLensPanelConfigInputSchema = lensPanelConfigInputSchema
  .omit({ grid: true })
  .extend({
    panelId: z.string().max(256).describe('Existing Lens panel id to update.'),
    esql: esqlSchema
      .optional()
      .describe(
        '(optional) New ES|QL query from the panel ES|QL generation tool. Omit it to keep the panel query.'
      ),
    config: lensConfigSchema.describe(
      'Complete new Lens API config. Fully replaces the existing config. Omit `data_source`.'
    ),
  });

export const lensConfigPanelKind = defineConfigPanelKind({
  type: 'lens',
  embeddableType: LENS_EMBEDDABLE_TYPE,
  label: 'Lens',
  addInputSchema: lensPanelConfigInputSchema,
  editInputSchema: editLensPanelConfigInputSchema,
});
