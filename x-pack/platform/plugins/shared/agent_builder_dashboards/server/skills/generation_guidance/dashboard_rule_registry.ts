/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from './design/composition';
import { dashboardControlsPrompt } from './design/controls';
import { gridLayoutPrompt } from './design/grid_layout';

/**
 * Dashboard-level prompt topics. Same shape as the chart-type registry:
 * `config.rules` is design HOW (skill body only); `review.critical` /
 * `review.suggestions` are compiled only into the review prompt — do not
 * restate `config.rules`.
 */
export interface DashboardRuleEntry {
  prompt: {
    review?: {
      /**
       * Painted violations and judge exceptions. Name the failure; do not
       * repeat the sizing table or other HOW from `config.rules`.
       */
      critical?: string[];
      /**
       * Weaker painted prompts. Omit anything already covered by `config.rules`.
       */
      suggestions?: string[];
    };
    config?: {
      rules?: string[];
    };
  };
}

export const dashboardRuleTopics = {
  composition: 'composition',
  grid: 'grid',
  controls: 'controls',
} as const;

export type DashboardRuleTopic = (typeof dashboardRuleTopics)[keyof typeof dashboardRuleTopics];

export type DashboardRuleRegistry = Record<DashboardRuleTopic, DashboardRuleEntry>;

export const dashboardRuleRegistry: DashboardRuleRegistry = {
  [dashboardRuleTopics.composition]: {
    prompt: {
      review: {
        critical: [
          'Decorative sections with no topical grouping are a critical issue.',
          'About 6+ visualization panels, or mixed topics (KPIs, trends, breakdowns), with no topical sections is a critical issue. Skip a small single-topic dashboard.',
          'A panel in the wrong topical section is a critical issue (KPI outside Key Metrics, or a trend/table among KPIs).',
          'Key Metrics / Overview must be KPI-only. A table or time series there is a critical issue.',
          'A piecemeal layout is a critical issue — rethink where panels live.',
          'Time-series XY with no legend avg/min/max is a critical issue. The edit query must include "show avg/min/max in the legend". Skip categorical bars, field AVG/MIN/MAX, and dashboards that already have them.',
        ],
      },
      config: {
        rules: [dashboardCompositionPrompt.trim()],
      },
    },
  },
  [dashboardRuleTopics.grid]: {
    prompt: {
      review: {
        critical: [
          'Any w or h that violates ### Grid sizes by chart type or Grid Packing Rules is a critical issue. A last panel in a row stretched to fill leftover columns is not this issue — except a datatable with w less than 24.',
          'Visible gaps, leftover odd widths, or a partly reflowed row/section is a critical issue — rethink where panels live.',
          'An L-shaped hole is a critical issue.',
          'A datatable with w less than 24 is a critical issue.',
        ],
      },
      config: {
        rules: [gridLayoutPrompt.trim()],
      },
    },
  },
  [dashboardRuleTopics.controls]: {
    prompt: {
      review: {
        critical: [
          'A new multi-entity dashboard with no categorical controls is a critical issue.',
          'More than one time_slider_control is a critical issue.',
        ],
      },
      config: {
        rules: [dashboardControlsPrompt.trim()],
      },
    },
  },
};
