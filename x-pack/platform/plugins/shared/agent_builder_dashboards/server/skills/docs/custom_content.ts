/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { DashboardSkillDoc } from './okf_document';

export const customContentDoc: DashboardSkillDoc = {
  name: 'custom_content',
  type: 'reference',
  title: 'Custom content panels',
  description:
    'When an HTML-based custom content panel is justified, how to create and edit one, and how its ES|QL query and height must be set.',
  body: `Reach for custom content only when nothing above fits:
- Any standard time series, bar, pie, metric, or data table → use Lens.
- Scatter plots, faceted charts, layered charts, combination charts → use Vega.
- Plain explanatory text with no data → use markdown.
- The content needs an HTML/CSS layout no single Lens chart type can express, or mixes narrative text with live data, or the user explicitly asks for a custom/HTML panel → use custom content.

**ES|QL for custom content:** set \`config.esqlQuery\` yourself when the panel needs live data — omitting it renders static content with no data, it does not get generated for you. Build the query with \`${platformCoreTools.generateEsql}\` rather than writing it directly, or use one the user supplied verbatim. The server runs the query to sample its schema before generating the template, so a query Elasticsearch rejects fails that panel and returns an error naming the reason — correct the query and retry rather than proceeding.

**Creating a custom content panel:**
- Set \`config.prompt\` to a concise description of what to display. Do not supply \`template\` — it is generated server-side from the prompt.
- Set \`config.esqlQuery\` when the panel needs live data.
- Give it enough height. These panels lay out as HTML and scroll inside their own frame when the grid is too short for the content, so size \`grid.h\` from what you asked for — see the custom content entry in the grid sizes below.

**Editing a custom content panel:**
- Use \`edit_panels\` (\`source: "config"\`, \`type: "custom_content"\`) and set \`panelId\` to the target panel.
- Supply only \`prompt\` and/or \`esqlQuery\` — omit fields that should stay unchanged. The server regenerates the template from the merged prompt and query. Do not supply \`template\`.`,
};
