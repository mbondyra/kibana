/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardSkillDoc } from './okf_document';
import { createDashboardDoc } from './create_dashboard';
import { editDashboardDoc } from './edit_dashboard';
import { enhanceDashboardDoc } from './enhance_dashboard';
import { panelsDoc } from './panels';
import { customContentDoc } from './custom_content';
import { controlsDoc } from './controls';
import { compositionDoc } from './composition';
import { gridLayoutDoc } from './grid_layout';

/** Every document of the skill's knowledge tree, in index order. */
export const dashboardSkillDocs: readonly DashboardSkillDoc[] = [
  createDashboardDoc,
  editDashboardDoc,
  enhanceDashboardDoc,
  panelsDoc,
  customContentDoc,
  controlsDoc,
  compositionDoc,
  gridLayoutDoc,
];

export {
  DASHBOARD_SKILL_BASE_PATH,
  DASHBOARD_SKILL_NAME,
  DASHBOARD_SKILL_ROOT,
  dashboardSkillDocPath,
  toIndexLine,
  toOkfMarkdown,
  toReferencedContent,
} from './okf_document';
export type { DashboardSkillDoc, DashboardSkillDocType } from './okf_document';
