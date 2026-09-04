/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';

export const getChartTypeSelectionPromptContent = () =>
  [
    "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:",
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { prompt }]) => `- ${chartType}: ${prompt.selection}`
    ),
  ].join('\n');

export const getChartTypeConfigPromptContent = (chartType: SupportedChartType) => {
  const rules = chartTypeRegistry[chartType].prompt.config?.rules;

  if (!rules?.length) {
    return '';
  }

  return [
    `CHART-SPECIFIC RULES FOR ${chartType.toUpperCase()}:`,
    ...rules.map((rule) => `- ${rule}`),
  ].join('\n');
};

/**
 * Screenshot-facing review for prettify: per-chart `review.critical` only.
 * Suggestions stay off this path — they slow first-pass review. Title,
 * number-format, coloring, and `config.rules` stay on the visualization-author
 * path ({@link getChartTypeConfigPromptContent} and the color-palette prompt).
 */
export const getChartTypeReviewPromptContent = (): string => {
  const sections = Object.entries(chartTypeRegistry).flatMap(([chartType, { prompt }]) => {
    const critical: string[] = prompt.review?.critical ?? [];

    if (!critical.length) {
      return [];
    }

    return [`### ${chartType}`, 'Critical:', ...critical.map((rule) => `- ${rule}`)];
  });

  if (!sections.length) {
    return '';
  }

  return ['CHART REVIEW RULES:', ...sections].join('\n');
};
