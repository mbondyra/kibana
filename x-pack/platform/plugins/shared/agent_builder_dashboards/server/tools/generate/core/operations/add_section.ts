/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { sectionGridSchema } from '@kbn/agent-builder-dashboards-common';
import type { DashboardSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { defineOperation } from './types';
import { findSectionIndex } from '../dashboard_state';

export const addSectionOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_section'),
    key: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Key to reference this section as sectionId later in this call. Unique, must not match an existing section id; not saved.'
      ),
    title: z.string().max(256).describe('Section title.'),
    grid: sectionGridSchema,
  }),
  handler: ({ dashboardData, operation, context }) => {
    const { key } = operation;
    if (key !== undefined) {
      if (context.sectionIdsByKey.has(key)) {
        throw new Error(`Section key "${key}" is already used in this call.`);
      }
      if (findSectionIndex(dashboardData.panels, key) !== -1) {
        throw new Error(`Section key "${key}" conflicts with an existing section id.`);
      }
    }

    const section: DashboardSection = {
      id: uuidv4(),
      title: operation.title,
      collapsed: false,
      grid: operation.grid,
      panels: [],
    };

    if (key !== undefined) {
      context.sectionIdsByKey.set(key, section.id);
    }

    return {
      ...dashboardData,
      panels: [...dashboardData.panels, section],
    };
  },
});
