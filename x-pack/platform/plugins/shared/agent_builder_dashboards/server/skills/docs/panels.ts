/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getChartTypeSelectionPromptContent,
  seriesStatisticsAgentGuidance,
} from '@kbn/agent-builder-visualizations-server';
import type { DashboardSkillDoc } from './okf_document';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

export const panelsDoc: DashboardSkillDoc = {
  name: 'panels',
  type: 'reference',
  title: 'Panel inputs and chart types',
  description:
    'How to request a new or edited panel (source, renderer, index, query, chartType), which panel type to choose, the primary time-series rule, and the list of available chart types.',
  body: `## Panel Inputs

Each visualization request is authored in a separate context. New-panel authors do not see the dashboard attachment or other panels, so pass the exact known \`index\` and describe the measure, fields, and filters in \`query\`. Omit \`index\` only when the source is unknown and discovery is needed. Existing-panel edits receive the original configuration and queries automatically through \`panelId\`.

- Use \`source: "request"\` to create or edit a Lens or Vega panel from a natural-language / ES|QL query — this is the only correct way to make a **new** visualization. Never hand-build a visualization \`config\` for a new visualization.
- Use \`source: "attachment"\` with an \`attachment_id\` to place any visualization that already exists in this conversation — anything \`${platformCoreTools.createVisualization}\` returned. Pass only the id and a \`grid\`; the attachment's own renderer decides the panel type. Prefer this over \`source: "config"\` whenever you have an id: it costs far fewer tokens than repeating the payload, and for custom content it is the only way to place the panel that was actually generated — a custom content \`config\` takes a prompt and generates a **new** template, producing a different panel.
- Use \`source: "config"\` for markdown, and for a visualization you hold by value with no attachment id.

## Panel Type Selection

Choose the panel type in this priority order:

1. **Lens** (\`source: "request"\`, \`renderer: "lens"\` or omit renderer) — default for metric, time series, bar, line, pie, area, and data table visualizations.
2. **Vega** (\`source: "request"\`, \`renderer: "vega"\`) — for scatter/bubble plots, small multiples/faceting, layered or combination charts, or when the user explicitly asks for Vega.
3. **Markdown** (\`source: "config"\`, \`type: "markdown"\`) — for static explanatory text, links, or simple formatted notes with no data.
4. **Custom content** (\`source: "config"\`, \`type: "custom_content"\`) — a last resort for HTML-based layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or panels that mix narrative text with live data values.

## Chart Type Guidance

For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

Before \`add_panels\`, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}`,
};
