/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';
import { buildEsqlAdditionalInstructions } from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';

export const AUTHOR_LENS_PANELS_REFERENCE_NAME = 'author-lens-panels';

/** Pointer to the direct Lens authoring workflow, added to the skill content in direct mode. */
export const directLensAuthoringGuidance = `

### Authoring Lens Panels Directly

Author new and edited ES|QL Lens panels yourself with \`source: "config"\`, \`type: "lens"\`, an \`esql\` query, and a Lens \`config\`. Before the first one, read the referenced file \`${AUTHOR_LENS_PANELS_REFERENCE_NAME}.md\` and follow its workflow. Where this skill phrases a Lens \`query\` for a request, author the equivalent config instead. Use \`source: "request"\` for Lens only where that file says so.`;

/** The direct Lens authoring workflow, loaded on demand. */
export const authorLensPanelsReference: ReferencedContent = {
  name: AUTHOR_LENS_PANELS_REFERENCE_NAME,
  relativePath: '.',
  content: `# Authoring Lens Panels Directly

You write the ES|QL query and the Lens config of each panel. The ${
    dashboardTools.generateDashboard
  } tool validates them without changing them: the query must run, the config must match the chart type's schema, and every bound column must be returned by the query. Fix the reported error and retry the failed panels.

1. **Write the query.** Follow the ES|QL rules below. Run each new or changed query with \`${
    platformCoreTools.executeEsql
  }\` before you use it, and note the exact result column names and types. Do not guess column names.
2. **Load the chart guide.** Call \`${
    dashboardTools.getPanelSchema
  }\` once per chart type you author in this conversation, in parallel when you need several. Follow its chart rules and the house-style example that fits. Request schema \`sections\` only for a setting the examples do not show.
3. **Write the config.** \`config.type\` is the chart type. Bind result columns with \`{ "column": "<name>" }\`, using the names from step 1 verbatim. Omit \`data_source\`: the query is attached to every data source. Give every panel a concise title that names the measure.
4. **Send the panel.** New panel: \`content: { source: "config", type: "lens", esql, config }\`. Edit by panel id: send the complete new \`config\`, which replaces the old one, and send \`esql\` only when the query changes. Read the existing config from the dashboard attachment first and keep its unrelated settings.

Keep \`source: "request"\` for Vega and custom content panels. For enhancing an existing dashboard, follow \`enhance-dashboard.md\` as written, including its \`source: "request"\` edits.

## ES|QL rules
${buildEsqlAdditionalInstructions()}`,
};
