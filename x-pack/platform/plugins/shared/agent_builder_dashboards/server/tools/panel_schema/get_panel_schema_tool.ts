/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { SupportedChartType, ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  getLensAuthoringGuide,
  getLensSchemaSectionNames,
} from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';

const getPanelSchemaSchema = z.object({
  chartType: z
    .nativeEnum(SupportedChartType)
    .describe('Lens chart type to author, the config `type`.'),
  sections: z
    .array(z.string().max(64))
    .max(20)
    .optional()
    .describe(
      '(optional) Schema sections to load, from the section index of the guide. Omit to get the guide.'
    ),
});

/**
 * Inline tool that returns what the agent needs to author a Lens config directly: the authoring
 * guide of a chart type, or the JSON schema of some of its sections.
 */
export const getPanelSchemaTool = (): BuiltinSkillBoundedTool<typeof getPanelSchemaSchema> => ({
  id: dashboardTools.getPanelSchema,
  type: ToolType.builtin,
  description: `Get the guide for authoring a Lens config of a chart type: chart rules, coloring, house-style examples, and an index of the schema sections. Call it once per chart type before you author a \`source: "config"\`, \`type: "lens"\` panel. Pass \`sections\` to get the JSON schema of specific sections when you need a setting the examples do not show.`,
  schema: getPanelSchemaSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ chartType, sections = [] }) => {
    const sectionNames = getLensSchemaSectionNames(chartType);
    const unknownSections = sections.filter((section) => !sectionNames.includes(section));
    if (unknownSections.length > 0) {
      return {
        results: [
          createErrorResult(
            `Unknown ${chartType} schema sections: ${unknownSections.join(
              ', '
            )}. Available sections: ${sectionNames.join(', ')}.`
          ),
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: { chartType, guide: getLensAuthoringGuide(chartType, sections) },
        },
      ],
    };
  },
});
