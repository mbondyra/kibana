/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dashboard element configuration for markdown rendering.
 * This defines how dashboard tags are parsed and rendered in markdown.
 */
export const dashboardElement = {
  tagName: 'dashboard',
  attributes: {
    toolResultId: 'tool-result-id',
  },
} as const;

