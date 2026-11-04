/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels, getPanelKind, isRecord } from '../dashboard_panels';
import { getLastWrittenDashboardId } from '../extract_dashboard';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import type { DashboardAgentEvaluator, PanelColorName, PanelEditGold } from '../types';

export const DASHBOARD_PANEL_EDITS_EVALUATOR_NAME = 'Dashboard Panel Edits';

/** Every string stored under a `color` key anywhere in the config. */
const collectColors = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectColors);
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    key === 'color' && typeof child === 'string' ? [child] : collectColors(child)
  );
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Hue in degrees and saturation from 0 to 1 of a `#rgb`, `#rrggbb` or `#rrggbbaa` color. */
const toHueSaturation = (color: string): { hue: number; saturation: number } | undefined => {
  const digits = HEX_COLOR.exec(color.trim())?.[1];
  if (!digits) {
    return undefined;
  }
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
  const [red, green, blue] = [0, 2, 4].map(
    (offset) => parseInt(full.slice(offset, offset + 2), 16) / 255
  );
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) {
    return { hue: 0, saturation: 0 };
  }
  // HSV saturation, so a pale tint such as #ffcccc does not pass for the full hue.
  const saturation = delta / max;
  const sector =
    max === red
      ? ((green - blue) / delta + 6) % 6
      : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4;
  return { hue: sector * 60, saturation };
};

/** Hue window, in degrees around the named hue, that a requested color may fall in. */
const HUE_TOLERANCE = 20;
const MIN_SATURATION = 0.4;
const NAMED_HUES: Record<PanelColorName, number> = { red: 0 };

export const matchesColorName = (color: string, name: PanelColorName): boolean => {
  if (color.trim().toLowerCase() === name) {
    return true;
  }
  const parsed = toHueSaturation(color);
  if (!parsed || parsed.saturation < MIN_SATURATION) {
    return false;
  }
  const distance = Math.abs(parsed.hue - NAMED_HUES[name]);
  return Math.min(distance, 360 - distance) <= HUE_TOLERANCE;
};

const BULLET_ITEM = /^\s*[-*+]\s+\S/;

const countBulletItems = (content: string): number =>
  content.split('\n').filter((line) => BULLET_ITEM.test(line)).length;

const checkPanelEdit = (
  { panel: id, kind, title, color, bulletList }: PanelEditGold,
  index: number,
  panels: Map<string, AttachmentPanel>
): Check => {
  const assertion = `panelEdits[${index}]`;
  const panel = panels.get(id);
  if (!panel) {
    return { assertion, passed: false, detail: `${id} not found` };
  }
  const { config } = panel;
  const panelKind = getPanelKind(panel);
  const panelTitle = typeof config.title === 'string' ? config.title : undefined;
  const colors = collectColors(config);
  const content = typeof config.content === 'string' ? config.content : '';

  const problems = compact([
    kind !== undefined && panelKind !== kind ? `kind ${panelKind}, not ${kind}` : undefined,
    title !== undefined && panelTitle?.trim().toLowerCase() !== title.toLowerCase()
      ? `title ${panelTitle === undefined ? 'missing' : `"${panelTitle}"`}, not "${title}"`
      : undefined,
    color !== undefined && !colors.some((value) => matchesColorName(value, color))
      ? `colors [${colors.join(', ')}] have no ${color}`
      : undefined,
    bulletList && countBulletItems(content) < 2 ? 'no bullet list' : undefined,
  ]);

  return {
    assertion,
    passed: problems.length === 0,
    detail: `${id}: ${problems.length === 0 ? 'edited as asked' : problems.join('; ')}`,
  };
};

/**
 * Checks that a panel the prompt edits in place keeps its id and ends up with
 * the requested chart type, title, color or markdown content. Whether the
 * rest of the layout held is scored by Dashboard Layout Edit.
 */
export const dashboardPanelEditsEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_PANEL_EDITS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.panelEdits;
    if (!gold || gold.length === 0) {
      return skippedResult('No panel edit gold.');
    }
    const { dashboard, steps = [] } = output;
    // Without a write the result is the seed itself, which has none of the requested edits.
    if (!dashboard || getLastWrittenDashboardId(steps) === undefined) {
      return noDashboardResult;
    }

    const panels = new Map(getLeafPanels(dashboard).map((panel) => [panel.id, panel]));
    const checks = gold.map((edit, index) => checkPanelEdit(edit, index, panels));
    return scoreChecks(checks, { subject: 'panel edit', passLabel: 'match' });
  },
};
