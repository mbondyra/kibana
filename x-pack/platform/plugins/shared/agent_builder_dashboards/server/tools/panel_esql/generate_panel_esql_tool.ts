/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { generateVisualizationEsql } from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';

const generatePanelEsqlSchema = z.object({
  query: z
    .string()
    .max(2048)
    .describe(
      'What the panel shows: the measure, the grouping (over time or by category), fields, and filters.'
    ),
  index: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) Exact index, alias, or datastream to query. Pass it whenever known. Omit only when the source is unknown and discovery is needed.'
    ),
  existingEsql: z
    .string()
    .max(4096)
    .optional()
    .describe(
      "(optional) The panel's current ES|QL query, when changing the query of an existing panel. Its source and unrelated clauses are kept."
    ),
});

/**
 * Inline tool that generates the ES|QL query of a directly authored Lens panel with the same
 * generator, rules, and validation as generated panels, and returns the query with its columns.
 */
export const generatePanelEsqlTool = (): BuiltinSkillBoundedTool<
  typeof generatePanelEsqlSchema
> => ({
  id: dashboardTools.generatePanelEsql,
  type: ToolType.builtin,
  description: `Generate the ES|QL query of a Lens panel you author with \`source: "config"\`, \`type: "lens"\`. Returns a validated, visualization-ready query and its result columns (names and types) to bind in the config. Call it once per new or changed query, in parallel for several panels.`,
  schema: generatePanelEsqlSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ query, index, existingEsql }, { modelProvider, events, logger, esClient }) => {
    const generated = await generateVisualizationEsql({
      nlQuery: query,
      index,
      existingQueries: existingEsql ? [existingEsql] : [],
      modelProvider,
      events,
      logger,
      esClient,
    });

    if (!generated.query) {
      return {
        results: [
          createErrorResult(`Failed to generate the ES|QL query: ${generated.error ?? 'unknown'}`),
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            esql: generated.query,
            columns: (generated.columns ?? []).map(({ name, type }) => ({ name, type })),
          },
        },
      ],
    };
  },
});
