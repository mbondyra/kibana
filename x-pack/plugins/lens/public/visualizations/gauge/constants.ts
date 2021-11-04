/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


export const LENS_GAUGE_RENDERER = 'lens_gauge_renderer';

export const LENS_GAUGE_ID = 'lnsGauge';
export const DEFAULT_PALETTE_NAME = 'temperature';


export const GAUGE_CHART_TYPES = {
  GAUGE: 'gauge',
} as const;

export const GROUP_ID = {
  METRIC: 'metric',
  MIN: 'min',
  MAX: 'max',
  GOAL: 'goal',
} as const;

export const GAUGE_FUNCTION = 'lens_gauge';

export const GAUGE_APPEARANCE_FUNCTION = 'lens_gauge_appearance';
