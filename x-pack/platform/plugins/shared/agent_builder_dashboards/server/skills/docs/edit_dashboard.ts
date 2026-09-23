/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_SKILL_ROOT, type DashboardSkillDoc } from './okf_document';

export const editDashboardDoc: DashboardSkillDoc = {
  name: 'edit_dashboard',
  type: 'howto',
  title: 'Change an existing dashboard',
  description:
    'Workflow for adding, editing, moving or removing panels and controls on a dashboard that already exists, including the limits on non-ES|QL panels.',
  body: `Read \`${DASHBOARD_SKILL_ROOT}/reference/grid_layout.md\` with this document. Read \`${DASHBOARD_SKILL_ROOT}/reference/panels.md\` too when the change creates new panels, and \`${DASHBOARD_SKILL_ROOT}/reference/controls.md\` when it adds controls.

## Using Dashboard Operations

For an existing dashboard:
- Use \`edit_panels\` to change existing panel content in place. Reorganizing or enhancing a dashboard does not require replacing panels.
- For focused edits, pass only the requested change in the edit \`query\` (e.g. "make the error series blue"). The chart author preserves unrelated presentation settings. Set \`applyChartRules: true\` to apply all presentation defaults to an existing ES|QL Lens panel instead.
- Set \`preserveESQL: true\` when the panel's query should stay unchanged. Omit it when the edit changes what the panel measures. This is independent of \`applyChartRules\`, so a query change and presentation enhancement can share one edit.
- If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
- Use \`update_panel_layouts\` to resize, reposition, or move existing panels between top-level and sections without changing panel content.

## Generation Edge Cases

- Never invent a \`source: "config"\` payload for content you have not actually resolved. If you cannot obtain a panel's configuration, report it clearly instead of fabricating one.
- Use \`update_panel_layouts\` when the user wants to resize, reposition, or move panels without changing panel content.
- If a user wants to change a dashboard panel's content, prefer \`edit_panels\` over removing and re-adding the panel. \`edit_panels\` works for ES|QL-backed Lens visualization panels (\`source: "request"\`), markdown panels (\`source: "config"\`, \`type: "markdown"\`), and custom content panels (\`source: "config"\`, \`type: "custom_content"\`).
- A dashboard can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you remove or replace the existing panel.
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement operations.`,
};
