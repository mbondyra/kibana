/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { timeRangeSchema } from '@kbn/agent-builder-dashboards-common';
import { defineOperation } from './types';

export const setMetadataOperation = defineOperation({
  schema: z.object({
    operation: z.literal('set_metadata'),
    title: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Non-empty title. Invent one from the contents when the current title is missing or a placeholder.'
      ),
    description: z.string().max(2048).optional(),
    time_range: timeRangeSchema
      .optional()
      .describe(
        'Only when the user named a time window; a data-aware default applies otherwise. Kibana date math ({ from: "now-7d", to: "now" }) or ISO 8601 with mode "absolute".'
      ),
  }),
  handler: ({ dashboardData, operation, context }) => {
    if (
      operation.title === undefined &&
      operation.description === undefined &&
      operation.time_range === undefined
    ) {
      context.logger.debug('Skipping empty set_metadata operation');
      return dashboardData;
    }

    const metadataPatch = {
      ...(operation.title !== undefined ? { title: operation.title } : {}),
      ...(operation.description !== undefined ? { description: operation.description } : {}),
      ...(operation.time_range !== undefined ? { time_range: operation.time_range } : {}),
    };

    return {
      ...dashboardData,
      ...metadataPatch,
    };
  },
});
