/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { executeEsql, validateEsqlQuery } from '@kbn/agent-builder-genai-utils';
import { buildTimeRangeParams } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import { cloneDeep } from 'lodash';
import { chartTypeRegistry } from './chart_type_registry';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { getColorConfigPromptContent } from './color_palettes';
import { getConfigExamples } from './config_examples';
import { getEsqlDataSourceCarriers } from './graph_lens';
import {
  filterSchemaSections,
  getFailingSchemaSections,
  getSchemaSectionIndex,
  getSchemaSectionNames,
  renderSchemaSections,
} from './schema_sections';
import type { VisualizationConfig } from './types';

/** Range bound to `?_tstart`/`?_tend` when the query runs to collect its columns. */
const COLUMNS_PROBE_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

export { getSchemaSectionNames as getLensSchemaSectionNames };

/**
 * Authoring guide for writing a Lens config of a chart type directly: the chart rules, coloring,
 * house-style examples, and the index of schema sections. With `sections`, returns the JSON
 * schema of those sections instead.
 */
export const getLensAuthoringGuide = (
  chartType: SupportedChartType,
  sections: readonly string[] = []
): string => {
  const sectionNames = filterSchemaSections(chartType, sections);
  if (sectionNames.length > 0) {
    return renderSchemaSections(chartType, sectionNames);
  }
  return [
    getChartTypeConfigPromptContent(chartType),
    getColorConfigPromptContent(chartType),
    'HOUSE-STYLE EXAMPLES (follow the one that fits the request and the query result; replace every <placeholder> with a result column name or real text):',
    ...getConfigExamples(chartType).map(
      ({ label, config }) => `${label}:\n\`\`\`json\n${JSON.stringify(config)}\n\`\`\``
    ),
    'SCHEMA SECTIONS (`field: a|b` lists accepted values, `*` marks a required field, `one of: (…) | (…)` lists alternative shapes). Request the JSON schema of a section only when you need a setting the examples do not show:',
    getSchemaSectionIndex(chartType),
  ]
    .filter(Boolean)
    .join('\n\n');
};

const collectBoundColumns = (value: unknown, columns: Set<string>): Set<string> => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectBoundColumns(item, columns));
    return columns;
  }
  if (!value || typeof value !== 'object') {
    return columns;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'column' && typeof child === 'string') {
      columns.add(child);
    } else if (key !== 'data_source') {
      collectBoundColumns(child, columns);
    }
  }
  return columns;
};

const formatColumns = (columns: readonly EsqlEsqlColumnInfo[]): string =>
  columns.map(({ name, type }) => `${JSON.stringify(name)} (${type})`).join(', ');

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export type AuthoredLensConfigValidation =
  | { valid: true; config: VisualizationConfig }
  | { valid: false; error: string };

/**
 * Validates a Lens config written by the caller, without any LLM call: the ES|QL query must be
 * valid and run, the config must match the chart type's schema once the query is pinned to every
 * data source, and every bound column must be returned by the query.
 */
export const validateAuthoredLensConfig = async ({
  chartType,
  esql,
  config,
  esClient,
}: {
  chartType: SupportedChartType;
  esql: string;
  config: Record<string, unknown>;
  esClient: IScopedClusterClient;
}): Promise<AuthoredLensConfigValidation> => {
  const esqlError = await validateEsqlQuery(
    esql,
    buildServerESQLCallbacks({ client: esClient.asCurrentUser })
  );
  if (esqlError) {
    return { valid: false, error: `The ES|QL query is invalid: ${esqlError}` };
  }

  let columns: EsqlEsqlColumnInfo[];
  try {
    ({ columns } = await executeEsql({
      query: esql,
      params: buildTimeRangeParams(COLUMNS_PROBE_TIME_RANGE),
      limit: 1,
      dropNullColumns: false,
      esClient: esClient.asCurrentUser,
    }));
  } catch (error) {
    return { valid: false, error: `The ES|QL query failed to run: ${getErrorMessage(error)}` };
  }

  const candidate = { ...cloneDeep(config), type: chartType };
  getEsqlDataSourceCarriers(candidate).forEach((carrier) => {
    carrier.data_source = { type: 'esql', query: esql };
  });

  const parsed = chartTypeRegistry[chartType].schema.safeParse(candidate);
  if (!parsed.success) {
    const failingSections = getFailingSchemaSections(chartType, parsed.error);
    const issues = parsed.error.issues
      .map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message))
      .join('; ');
    return {
      valid: false,
      error: `The ${chartType} config does not match its schema: ${issues}.${
        failingSections.length
          ? ` Check the schema of these sections: ${failingSections.join(', ')}.`
          : ''
      }`,
    };
  }

  const resultColumnNames = new Set(columns.map(({ name }) => name));
  const missingColumns = [...collectBoundColumns(parsed.data, new Set())].filter(
    (column) => !resultColumnNames.has(column)
  );
  if (missingColumns.length > 0) {
    return {
      valid: false,
      error: `The config binds columns the ES|QL query does not return: ${missingColumns
        .map((column) => JSON.stringify(column))
        .join(', ')}. Result columns: ${formatColumns(columns)}.`,
    };
  }

  return { valid: true, config: parsed.data };
};
