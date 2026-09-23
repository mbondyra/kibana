/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

export const DASHBOARD_SKILL_BASE_PATH = 'skills/platform/dashboard' as const;
export const DASHBOARD_SKILL_NAME = 'dashboard-management' as const;

/** Agent-visible root of the skill's documents on the `/skills` mount. */
export const DASHBOARD_SKILL_ROOT = `/${DASHBOARD_SKILL_BASE_PATH}/${DASHBOARD_SKILL_NAME}`;

/**
 * OKF `type` values used by the skill's documents (https://okf.md/spec/):
 * a `howto` is a task workflow, a `reference` is looked up while performing one.
 */
export type DashboardSkillDocType = 'howto' | 'reference';

/**
 * One document of the skill's knowledge tree. The agent loads `SKILL.md` (the index) and reads
 * these on demand with `read_file`, so each one must stand alone for the task it covers.
 */
export interface DashboardSkillDoc {
  /** File name without extension; also the directory is the OKF type. */
  name: string;
  type: DashboardSkillDocType;
  title: string;
  /** One sentence shown in the index; it is what the agent uses to decide whether to read the file. */
  description: string;
  body: string;
}

export const dashboardSkillDocPath = (doc: Pick<DashboardSkillDoc, 'name' | 'type'>): string =>
  `${DASHBOARD_SKILL_ROOT}/${doc.type}/${doc.name}.md`;

const yamlString = (value: string): string => JSON.stringify(value);

/** Renders a document as OKF markdown: YAML frontmatter with `type`, `title`, `description`, then the body. */
export const toOkfMarkdown = (doc: DashboardSkillDoc): string =>
  [
    '---',
    `type: ${doc.type}`,
    `title: ${yamlString(doc.title)}`,
    `description: ${yamlString(doc.description)}`,
    '---',
    '',
    doc.body.trim(),
    '',
  ].join('\n');

export const toReferencedContent = (doc: DashboardSkillDoc): ReferencedContent => ({
  name: doc.name,
  relativePath: `./${doc.type}`,
  content: toOkfMarkdown(doc),
});

/** One OKF index line: `* [title](/absolute/path.md) - description`. */
export const toIndexLine = (doc: DashboardSkillDoc): string =>
  `* [${doc.title}](${dashboardSkillDocPath(doc)}) - ${doc.description}`;
