/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import {
  dashboardSkillDocPath,
  dashboardSkillDocs,
  toIndexLine,
  toReferencedContent,
} from '../docs';
import type { DashboardGuidanceModule } from '../guidance_module';

const docPath = (name: string): string => {
  const doc = dashboardSkillDocs.find((candidate) => candidate.name === name);
  if (!doc) {
    throw new Error(`Unknown dashboard skill document '${name}'`);
  }
  return `\`${dashboardSkillDocPath(doc)}\``;
};

const generateDashboard = dashboardTools.generateDashboard;
const createDoc = docPath('create_dashboard');
const editDoc = docPath('edit_dashboard');
const enhanceDoc = docPath('enhance_dashboard');
const panelsDoc = docPath('panels');
const customContentDoc = docPath('custom_content');
const controlsDoc = docPath('controls');
const compositionDoc = docPath('composition');
const gridLayoutDoc = docPath('grid_layout');

const guidance = `## Dashboard Operations

The ${generateDashboard} tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. This section describes the \`operations\` vocabulary; see the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Rules That Always Apply

- Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.
- Batch all operations into a single ${generateDashboard} call whenever possible; operations run in order.
- Create a **new** visualization only with \`source: "request"\`. Never hand-build a visualization \`config\`, and never invent a \`source: "config"\` payload for content you have not resolved.
- Every new Lens panel requires \`chartType\`.
- Never edit a DSL, form-based, or other non-ES|QL Lens panel directly. Explain that direct editing is not supported and ask for confirmation before replacing it with a new ES|QL-based Lens panel.
- Never invent an \`attachment_id\`, panel \`id\`, or \`sectionId\`; reuse values returned by prior tool results.

## ES|QL

Omit the \`esql\` field on visualization panels unless you received a validated query from a prior tool result or the user pasted one explicitly. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`.

## Documents

This skill is a small knowledge tree: this file is the index, the documents below hold the detailed guidance. **Before your first ${generateDashboard} call, read every document listed for your task with \`read_file\`, in one turn, and follow them.** Do not work from memory of their contents, and do not read documents your task does not list.

| Task | Read |
|------|------|
| Create a new dashboard | ${createDoc}, ${panelsDoc}, ${compositionDoc}, ${gridLayoutDoc}, ${controlsDoc} |
| Add, edit, move or remove panels or controls on an existing dashboard | ${editDoc}, ${gridLayoutDoc}; add ${panelsDoc} when creating new panels and ${controlsDoc} when adding controls |
| Enhance, improve or clean up a dashboard | ${enhanceDoc}, ${compositionDoc}, ${gridLayoutDoc} |
| Any task involving a custom content (HTML) panel | ${customContentDoc} in addition to the task's documents |
| Rename, retitle, or change dashboard metadata only | no document; use \`set_metadata\` |

${dashboardSkillDocs.map(toIndexLine).join('\n')}`;

/**
 * Environment-agnostic dashboard *generation* guidance, laid out as an OKF knowledge tree.
 *
 * `guidance` is the always-loaded part of `SKILL.md`: the operations vocabulary, the rules that
 * apply to every request, and the index of documents. The detailed workflows and references
 * live in `referencedContent` and are read by the agent on demand, so a request only pays for
 * the guidance it needs. It deliberately says nothing about how the current dashboard is
 * referenced or how the result is surfaced; pair it with an environment-specific rendering
 * guidance block (e.g. the Kibana one).
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: dashboardSkillDocs.map(toReferencedContent),
};
