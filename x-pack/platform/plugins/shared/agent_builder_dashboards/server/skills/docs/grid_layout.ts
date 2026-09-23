/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gridLayoutPrompt } from '../generation_guidance/design/grid_layout';
import type { DashboardSkillDoc } from './okf_document';

export const gridLayoutDoc: DashboardSkillDoc = {
  name: 'grid_layout',
  type: 'reference',
  title: 'Panel layout and grid',
  description:
    'The 48-column grid: sizes per chart type, packing and positioning rules, reflow after changes, section-relative coordinates, and a worked example.',
  body: `${gridLayoutPrompt}`,
};
