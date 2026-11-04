/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { SECTIONED_LOGS_DASHBOARD } from '../fixtures/sectioned_logs_dashboard';
import type { PanelEditGold } from '../types';
import { dashboardPanelEditsEvaluator, matchesColorName } from './panel_edits';

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

const editPanel = (
  id: string,
  change: (panel: AttachmentPanel) => AttachmentPanel
): DashboardAttachmentData => {
  const update = (panel: AttachmentPanel) => (panel.id === id ? change(panel) : panel);
  return {
    ...SECTIONED_LOGS_DASHBOARD,
    panels: SECTIONED_LOGS_DASHBOARD.panels.map((widget) =>
      isSection(widget) ? { ...widget, panels: widget.panels.map(update) } : update(widget)
    ),
  };
};

const evaluateEdits = (
  panelEdits: readonly PanelEditGold[] | undefined,
  dashboard: DashboardAttachmentData,
  steps: Array<Record<string, unknown>> = [WRITE_STEP]
) =>
  dashboardPanelEditsEvaluator.evaluate({
    input: { question: 'q' },
    expected: { panelEdits },
    metadata: undefined,
    output: { errors: [], messages: [], steps, before: SECTIONED_LOGS_DASHBOARD, dashboard },
  });

const redRequests: PanelEditGold = {
  panel: 'requests-over-time',
  kind: 'xy',
  title: 'Requests',
  color: 'red',
};

const recolor = (color: string) => (panel: AttachmentPanel) => {
  const [layer] = panel.config.layers as Array<Record<string, unknown>>;
  return {
    ...panel,
    config: {
      ...panel.config,
      title: 'requests',
      layers: [{ ...layer, y: [{ column: 'Value', color: { type: 'static', color } }] }],
    },
  };
};

describe('dashboard panel edits evaluator', () => {
  it('skips without gold and scores 0 when the agent never wrote the dashboard', async () => {
    expect((await evaluateEdits(undefined, SECTIONED_LOGS_DASHBOARD)).score).toBeNull();
    expect((await evaluateEdits([redRequests], SECTIONED_LOGS_DASHBOARD, [])).score).toBe(0);
  });

  it('passes a renamed chart with a red static color', async () => {
    const result = await evaluateEdits(
      [redRequests],
      editPanel('requests-over-time', recolor('#BD271E'))
    );
    expect(result.score).toBe(1);
  });

  it('fails the seed, which has neither the title nor the color', async () => {
    const result = await evaluateEdits([redRequests], SECTIONED_LOGS_DASHBOARD);
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('title "Requests over time", not "Requests"');
    expect(result.explanation).toContain('have no red');
  });

  it('scores the fraction of edited panels that match', async () => {
    const result = await evaluateEdits(
      [
        { panel: 'response-codes', kind: 'data_table' },
        { panel: 'intro', kind: 'markdown', bulletList: true },
      ],
      editPanel('intro', (panel) => ({
        ...panel,
        config: { content: '# Web traffic\n- Traffic: requests\n- Errors: 4xx and 5xx' },
      }))
    );
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('response-codes: kind pie, not data_table');
  });

  it('fails a panel the edit replaced under a new id', async () => {
    const result = await evaluateEdits(
      [{ panel: 'response-codes', kind: 'data_table' }],
      editPanel('response-codes', (panel) => ({ ...panel, id: 'response-codes-table' }))
    );
    expect(result.explanation).toContain('response-codes not found');
  });
});

describe('matchesColorName', () => {
  it.each(['red', '#f00', '#FF0000', '#BD271E', '#E7664C', '#ff000080'])('%s is red', (color) => {
    expect(matchesColorName(color, 'red')).toBe(true);
  });

  it.each(['#54B399', '#6092C0', '#D6BF57', '#808080', '#ffcccc', 'tomato'])(
    '%s is not red',
    (color) => {
      expect(matchesColorName(color, 'red')).toBe(false);
    }
  );
});
