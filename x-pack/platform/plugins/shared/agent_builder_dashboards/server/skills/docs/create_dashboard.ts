/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { DASHBOARD_SKILL_ROOT, type DashboardSkillDoc } from './okf_document';

export const createDashboardDoc: DashboardSkillDoc = {
  name: 'create_dashboard',
  type: 'howto',
  title: 'Create a dashboard',
  description:
    'Workflow for building a new dashboard: required metadata, batched panel and section operations, and the order in which to read the reference documents.',
  body: `Read \`${DASHBOARD_SKILL_ROOT}/reference/panels.md\`, \`${DASHBOARD_SKILL_ROOT}/reference/composition.md\`, \`${DASHBOARD_SKILL_ROOT}/reference/grid_layout.md\` and \`${DASHBOARD_SKILL_ROOT}/reference/controls.md\` together with this document before the first \`${dashboardTools.generateDashboard}\` call.

## Using Dashboard Operations

Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

Operations run in order, so earlier operations should set up state needed by later ones. Batch all operations into a single ${dashboardTools.generateDashboard} call whenever possible.

When a dashboard needs sections, prefer a single batched call:
1. For existing panels, create an empty \`add_section\` with a unique \`key\` (e.g. \`"overview"\`), omitting \`panels\`. Then use \`update_panel_layouts\` with the original \`panelId\` values and that key as \`sectionId\`. This moves the panels with their configurations intact.
2. Only use \`add_section.panels\` or \`add_panels\` to create new panels. They cannot move existing panels.
3. Create sections before referencing them. Keys must not match existing section IDs and are not saved; in later calls, use the generated section ID returned by the tool.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`. Only include \`time_range\` when the user explicitly named a specific time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise — a data-aware default is applied automatically.
- Use \`add_panels\` to add panels in one batched operation. A single \`add_panels\` call may mix panel kinds and target different \`sectionId\` values, so batch related panels together.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

Pick the chart type for every new panel from \`${DASHBOARD_SKILL_ROOT}/reference/panels.md\`, and add the controls described in \`${DASHBOARD_SKILL_ROOT}/reference/controls.md\` in the same batched call.`,
};
