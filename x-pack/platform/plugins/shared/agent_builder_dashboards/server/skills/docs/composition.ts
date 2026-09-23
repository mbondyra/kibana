/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from '../generation_guidance/design/composition';
import type { DashboardSkillDoc } from './okf_document';

export const compositionDoc: DashboardSkillDoc = {
  name: 'composition',
  type: 'reference',
  title: 'Dashboard composition',
  description:
    'How to order panels so a dashboard tells a coherent story (metrics, then trends, then breakdowns), how many panels to add, and when to use sections.',
  body: `${dashboardCompositionPrompt}`,
};
