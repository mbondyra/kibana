/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enhanceGuidancePrompt } from '../generation_guidance/enhance_guidance';
import { DASHBOARD_SKILL_ROOT, type DashboardSkillDoc } from './okf_document';

export const enhanceDashboardDoc: DashboardSkillDoc = {
  name: 'enhance_dashboard',
  type: 'howto',
  title: 'Enhance an existing dashboard',
  description:
    'Seven-step workflow for enhance, improve or clean up requests: inspect, assess the data, ask which mode to apply, rebuild text, arrange and enhance, verify, report.',
  body: `${enhanceGuidancePrompt}

Read \`${DASHBOARD_SKILL_ROOT}/reference/composition.md\` and \`${DASHBOARD_SKILL_ROOT}/reference/grid_layout.md\` for step 5, and \`${DASHBOARD_SKILL_ROOT}/reference/panels.md\` when content mode adds panels.`,
};
