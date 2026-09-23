/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import {
  MAX_VEGA_SPEC_LENGTH,
  VEGA_VIS_TYPE,
  type VisualizationRenderer,
} from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';
import type { PanelResolutionRequestBase } from '../../../resolve_panel';

/**
 * Lens visualization panel logic.
 *
 * A visualization reaches a dashboard either via `source: 'config'` (its
 * already-resolved Lens config passed by value) or `source: 'request'` (resolved
 * from a natural-language / ES|QL query). This module owns the Lens embeddable
 * identity, the by-value config contract, the vis input schemas (add + edit), and
 * the vis resolution-request contract. The resolver that turns these requests into
 * Lens panel content lives in `core/resolvers/vis_panel_resolver.ts`.
 */

/**
 * Request to resolve a Lens visualization panel from a natural-language / ES|QL
 * query. This is the `vis` member of the panel resolution union; the resolver
 * (see `core/resolvers/vis_panel_resolver.ts`) turns it into Lens panel content.
 */
export interface VisPanelResolutionRequest extends PanelResolutionRequestBase {
  type: 'vis';
  /** Natural language description of the desired visualization. */
  nlQuery: string;
  /** Index, alias, or datastream to target; discovered when omitted. */
  index?: string;
  /** Required for new Lens panels; optional for Vega panels and edits. */
  chartType?: SupportedChartType;
  /** ES|QL query to back the visualization; generated when omitted. */
  esql?: string;
  /**
   * Which engine renders the panel. Honored when adding a new panel (defaults to
   * Lens when omitted); ignored on edits, which keep the existing panel's
   * renderer.
   */
  renderer?: VisualizationRenderer;
  /** Keep the panel's existing ES|QL query and column bindings instead of regenerating them. */
  preserveESQL?: boolean;
  /** Reauthor the presentation from the chart rules instead of applying only the requested changes. */
  applyChartRules?: boolean;
}

const visPanelConfigSchema = z.record(z.string().max(256), z.unknown()).check((ctx) => {
  const config = ctx.value;

  if ('visualization' in config) {
    ctx.issues.push({
      code: 'custom',
      message:
        'config looks like a whole visualization attachment. Pass only its `visualization` field (a Lens API config, or a Vega `{ spec }` config), not the entire attachment.',
      input: config,
    });
    return;
  }

  // A Vega visualization's `visualization` field is a `{ spec }` config: accept
  // it by value and bound the serialized spec, matching the attachment schema.
  if ('spec' in config) {
    const { spec } = config as { spec?: unknown };
    if (typeof spec !== 'string' || spec.length === 0) {
      ctx.issues.push({
        code: 'custom',
        message: 'Vega panel config must provide a non-empty `spec` string.',
        input: config,
      });
    } else if (spec.length > MAX_VEGA_SPEC_LENGTH) {
      ctx.issues.push({
        code: 'custom',
        message: `Vega panel \`spec\` must be at most ${MAX_VEGA_SPEC_LENGTH} characters.`,
        input: config,
      });
    }
    return;
  }

  if (!('type' in config)) {
    ctx.issues.push({
      code: 'custom',
      message:
        'config is neither a Lens API config (missing a top-level `type`) nor a Vega config (missing `spec`). Pass the `visualization` field read from a visualization attachment.',
      input: config,
    });
  }
});

/**
 * The vis variant of a `config`-source panel input, discriminated by
 * `type: 'vis'`.
 */
export const visPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('vis'),
  grid: panelGridSchema,
  config: visPanelConfigSchema.describe(
    'Visualization config by value: an attachment\'s `visualization` field, either a Lens API config (top-level `type`) or a Vega `{ spec }`. Never hand-build one; use source: "request".'
  ),
});

const panelRequestShape = {
  source: z.literal('request'),
  grid: panelGridSchema,
  query: z.string().max(2048).describe('Natural language description of the visualization.'),
  index: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Exact index, alias or data stream for this panel. Pass it whenever known; omit only when discovery is needed.'
    ),
  esql: z
    .string()
    .max(4096)
    .optional()
    .describe(
      'Validated ES|QL from a prior tool result or the user. Omit otherwise; never write it yourself.'
    ),
  renderer: z
    .enum(['lens', 'vega'])
    .optional()
    .describe(
      'Defaults to lens. Use vega for small multiples, layered or combination charts, scatter/bubble plots, custom encodings, or on explicit request.'
    ),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe('Lens chart type. Required for Lens panels; for Vega an optional authoring hint.'),
};

const requireLensChartType = (
  payload: z.core.ParsePayload<{ renderer?: 'lens' | 'vega'; chartType?: SupportedChartType }>
): void => {
  const { renderer, chartType } = payload.value;
  if (renderer !== 'vega' && chartType === undefined) {
    payload.issues.push({
      code: 'custom',
      message: 'chartType is required when creating a Lens panel.',
      input: payload.value,
    });
  }
};

/** Builds the `source: "request"` panel input schema, extended with extra fields. */
export const buildPanelRequestSchema = <TExtra extends z.ZodRawShape>(extra: TExtra) =>
  z.object({ ...panelRequestShape, ...extra }).check(requireLensChartType);

export const panelRequestSchema = z.object(panelRequestShape).check(requireLensChartType);

export type PanelRequestInput = z.infer<typeof panelRequestSchema>;

export const editPanelRequestInputSchema = z.object({
  source: z.literal('request'),
  panelId: z.string().max(256).describe('Existing Lens or Vega panel id.'),
  query: z.string().max(2048).describe('Natural language description of the change.'),
  esql: panelRequestShape.esql,
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe('Change the chart family. Omit to keep the existing one.'),
  preserveESQL: z
    .boolean()
    .optional()
    .describe(
      'Keep the existing ES|QL query (presentation-only or chart-type edits). Omit when the edit changes what the panel measures.'
    ),
  applyChartRules: z
    .boolean()
    .optional()
    .describe(
      'Lens only. Apply all presentation defaults, replacing custom styling. Independent of preserveESQL.'
    ),
});

export type EditPanelRequestInput = z.infer<typeof editPanelRequestInputSchema>;

/**
 * Registry entry for the `vis` panel type. A by-value (`source: 'config'`) vis
 * panel can carry either a Lens API config or a Vega `{ spec }` config, so the
 * embeddable is chosen from the config shape: a `spec` string routes to the Vega
 * embeddable, everything else stays Lens. Vis is not editable via a
 * `source: 'config'` edit (edits go through `source: 'request'`), so
 * `validateConfigEdit` is intentionally omitted.
 */
export const visPanelDefinition = definePanelType({
  embeddableType: LENS_EMBEDDABLE_TYPE,
  buildPanelContent: (config) => {
    const isVegaConfig = typeof (config as { spec?: unknown })?.spec === 'string';
    return { type: isVegaConfig ? VEGA_VIS_TYPE : LENS_EMBEDDABLE_TYPE, config };
  },
});
