/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLensConfig,
  buildVegaConfig,
  getExistingEsqlQueries,
  validateAuthoredLensConfig,
  type VisualizationConfig,
} from '@kbn/agent-builder-visualizations-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  readVegaPanelSpec,
  toVegaPanelSpec,
  VEGA_VIS_TYPE,
} from '@kbn/agent-builder-visualizations-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createPanelFailureResult, type PanelContentAttempt } from '@kbn/dashboard-authoring';
import { getErrorMessage } from '@kbn/dashboard-authoring';
import type {
  AuthoredLensPanelResolutionRequest,
  VisPanelResolutionRequest,
} from '@kbn/dashboard-authoring';

/** Host plumbing the vis resolver needs to call the visualization builder. */
export interface VisPanelResolverDeps {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

/** Pull the serialized Vega spec out of an existing Vega panel's attachment config. */
const getExistingVegaSpec = (existingPanel: AttachmentPanel | undefined): string | undefined =>
  readVegaPanelSpec((existingPanel?.config as { spec?: unknown } | undefined)?.spec);

const SUPPORTED_CHART_TYPES: readonly string[] = Object.values(SupportedChartType);

const isSupportedChartType = (value: unknown): value is SupportedChartType =>
  typeof value === 'string' && SUPPORTED_CHART_TYPES.includes(value);

const getAuthoredEsql = (
  esql: string | undefined,
  existingPanel: AttachmentPanel | undefined
): string => {
  if (esql) {
    return esql;
  }
  const existingQueries = getExistingEsqlQueries(
    (existingPanel?.config as VisualizationConfig | undefined) ?? null
  );
  if (existingQueries.length !== 1) {
    throw new Error(
      existingQueries.length === 0
        ? 'The existing panel has no ES|QL query to keep. Provide `esql`.'
        : 'The existing panel has several ES|QL queries. Provide the `esql` query for the new config.'
    );
  }
  return existingQueries[0];
};

/** Validates a caller-authored Lens config and pins its ES|QL query to every data source. */
const resolveAuthoredLensPanel = async (
  { identifier, existingPanel, authored: { config, esql } }: AuthoredLensPanelResolutionRequest,
  esClient: IScopedClusterClient
): Promise<PanelContentAttempt> => {
  const { type: chartType } = config as { type?: unknown };
  if (!isSupportedChartType(chartType)) {
    throw new Error(
      `The Lens config \`type\` must be one of: ${SUPPORTED_CHART_TYPES.join(
        ', '
      )}. Received: ${JSON.stringify(chartType)}.`
    );
  }

  const validation = await validateAuthoredLensConfig({
    chartType,
    esql: getAuthoredEsql(esql, existingPanel),
    config: config as Record<string, unknown>,
    esClient,
  });
  if (!validation.valid) {
    return createPanelFailureResult(identifier, validation.error);
  }

  return {
    type: 'success',
    panelContent: { type: LENS_EMBEDDABLE_TYPE, config: validation.config },
  };
};

/**
 * Resolves Lens and Vega panel requests for the generate core's
 * `ResolvePanelContent` seam (see `panel_resolver.ts`).
 *
 * Builds inline visualization panel content from natural language / ES|QL using
 * Kibana plumbing (model provider, ES client, the visualization builders). It
 * resolves to a Lens panel (`buildLensConfig`) or, when the caller asks
 * for Vega, a native `vega` panel carrying the Vega-Lite spec as HJSON in its config
 * (`buildVegaConfig`), and returns it to the core through the type-agnostic
 * {@link PanelContentAttempt} contract.
 *
 * Lens configs the caller authored are validated without any LLM call instead of being generated.
 *
 * It trusts the request's `renderer` (Lens when omitted). On edits,
 * upsert sets it from the existing panel and rejects panels neither
 * renderer can edit, so the existing panel always matches the renderer.
 */
export const createVisPanelResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: VisPanelResolverDeps) => {
  const resolveGeneratedPanel = async ({
    identifier,
    nlQuery,
    index,
    chartType,
    esql,
    renderer = 'lens',
    preserveESQL,
    applyChartRules,
    existingPanel,
  }: VisPanelResolutionRequest): Promise<PanelContentAttempt> => {
    try {
      if (renderer === 'vega') {
        if (applyChartRules) {
          throw new Error('Presentation enhancement is only supported for ES|QL Lens panels.');
        }
        const { spec, title, authoringNote } = await buildVegaConfig({
          nlQuery,
          index,
          esql,
          existingSpec: getExistingVegaSpec(existingPanel),
          preserveESQL,
          chartType,
          modelProvider,
          logger,
          events,
          esClient,
        });

        // Store the native Vega API shape in the attachment. A temporary converter
        // expands it to the legacy-vis embeddable when the dashboard is
        // materialized for rendering.
        return {
          type: 'success',
          panelContent: {
            type: VEGA_VIS_TYPE,
            config: { spec: toVegaPanelSpec(spec), ...(title ? { title } : {}) },
          },
          ...(authoringNote ? { authoringNote } : {}),
        };
      }

      const existingConfig = existingPanel?.config as VisualizationConfig | undefined;

      const result = await buildLensConfig({
        nlQuery,
        index,
        chartType,
        esql,
        existingConfig: existingConfig ? JSON.stringify(existingConfig) : undefined,
        parsedExistingConfig: existingConfig,
        preserveESQL,
        applyChartRules,
        modelProvider,
        logger,
        events,
        esClient,
      });

      return {
        type: 'success',
        panelContent: {
          type: LENS_EMBEDDABLE_TYPE,
          config: result.validatedConfig,
        },
        ...(result.authoringNote ? { authoringNote: result.authoringNote } : {}),
      };
    } catch (error) {
      return createPanelFailureResult(identifier, getErrorMessage(error));
    }
  };

  return async (
    request: VisPanelResolutionRequest | AuthoredLensPanelResolutionRequest
  ): Promise<PanelContentAttempt> => {
    if (!('authored' in request)) {
      return resolveGeneratedPanel(request);
    }
    try {
      return await resolveAuthoredLensPanel(request, esClient);
    } catch (error) {
      return createPanelFailureResult(request.identifier, getErrorMessage(error));
    }
  };
};
