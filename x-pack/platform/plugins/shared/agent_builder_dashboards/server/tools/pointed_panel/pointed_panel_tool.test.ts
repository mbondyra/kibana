/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
} from '@kbn/agent-builder-dashboards-common';
import { VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-visualizations-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createPointedPanelTool } from './pointed_panel_tool';

const POINTER_ID = getDashboardPanelAttachmentId({
  dashboardAttachmentId: 'dashboard-1',
  panelId: 'panel-1',
});
const grid = { x: 0, y: 0, w: 24, h: 15 };

const pointer = (panelId = 'panel-1', dashboardAttachmentId = 'dashboard-1') => ({
  id: POINTER_ID,
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: {
        dashboard_attachment_id: dashboardAttachmentId,
        panel_id: panelId,
        label: 'Pointer label',
        panel_type: LENS_EMBEDDABLE_TYPE,
      },
    },
  ],
});

const dashboard = (panels: unknown[], extra: Record<string, unknown> = {}) => ({
  id: 'dashboard-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [{ version: 1, data: { title: 'Web Traffic', panels, ...extra } }],
});

const customPanel = (config: Record<string, unknown>) => ({
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  id: 'panel-1',
  grid,
  config,
});

const markdownPanel = { type: 'markdown', id: 'panel-1', grid, config: {} };

const lensPanel = (config: Record<string, unknown>) => ({
  type: LENS_EMBEDDABLE_TYPE,
  id: 'panel-1',
  grid,
  config,
});

const withPanels = (panels: unknown[], extra?: Record<string, unknown>) => ({
  [POINTER_ID]: pointer(),
  'dashboard-1': dashboard(panels, extra),
});

const logger = { debug: jest.fn(), error: jest.fn() } as unknown as Logger;

const run = async (
  records: Record<string, unknown>,
  { action = 'show', addError }: { action?: 'read' | 'show'; addError?: Error } = {}
) => {
  const add = jest.fn(async (input: { type: string; data: unknown }) => {
    if (addError) {
      throw addError;
    }
    return {
      id: 'viz-1',
      type: input.type,
      current_version: 1,
      versions: [{ version: 1, data: input.data }],
    };
  });
  const attachments = {
    getAttachmentRecord: jest.fn((id: string) => records[id]),
    add,
  } as unknown as AttachmentStateManager;
  const tool = createPointedPanelTool() as BuiltinToolDefinition;
  const returned = await tool.handler({ panel_attachment_id: POINTER_ID, action }, {
    attachments,
    logger,
  } as unknown as Parameters<BuiltinToolDefinition['handler']>[1]);
  if (!('results' in returned)) {
    throw new Error('Expected a results return');
  }
  return { result: returned.results[0], add };
};

const errorMessage = (result: { type: string; data: unknown }) => {
  expect(result.type).toBe(ToolResultType.error);
  return (result.data as { message: string }).message;
};

const lensConfig = {
  type: 'metric',
  title: 'Requests',
  data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
};

describe('createPointedPanelTool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads only the pointed panel with the dashboard stored time range', async () => {
    const { result, add } = await run(
      withPanels([lensPanel(lensConfig), { ...customPanel({ template: '<p/>' }), id: 'panel-2' }], {
        time_range: { from: 'now-7d', to: 'now' },
      }),
      { action: 'read' }
    );

    expect(result).toEqual({
      tool_result_id: expect.any(String),
      type: ToolResultType.other,
      data: {
        panel_attachment_id: POINTER_ID,
        dashboard_attachment_id: 'dashboard-1',
        panel: { id: 'panel-1', type: LENS_EMBEDDABLE_TYPE, title: 'Requests', config: lensConfig },
        time_range: { from: 'now-7d', to: 'now' },
      },
    });
    expect(add).not.toHaveBeenCalled();
  });

  it('reads panels that cannot be shown', async () => {
    const { result } = await run(withPanels([markdownPanel]), { action: 'read' });

    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: { panel: { id: 'panel-1', type: 'markdown', config: {} } },
    });
  });

  it('copies a custom panel with all its queries into a visualization attachment', async () => {
    const { result, add } = await run(
      withPanels([
        customPanel({
          title: 'Stick figure',
          template: '<svg />',
          esql_query: ['FROM logs', 'FROM metrics'],
        }),
      ])
    );

    expect(add).toHaveBeenCalledWith({
      type: VISUALIZATION_ATTACHMENT_TYPE,
      description: expect.stringContaining('Visualization:'),
      data: {
        renderer: 'custom_content',
        query: 'Panel "Stick figure" from dashboard "Web Traffic"',
        visualization: { template: '<svg />', title: 'Stick figure' },
        esql: ['FROM logs', 'FROM metrics'],
      },
    });
    expect(result).toMatchObject({
      type: ToolResultType.visualization,
      data: {
        attachment_id: 'viz-1',
        version: 1,
        renderer: 'custom_content',
        esql: 'FROM logs',
        visualization: { prompt: 'Panel "Stick figure" from dashboard "Web Traffic"' },
      },
    });
  });

  it('copies an ES|QL Lens panel with its config, query and chart type', async () => {
    const { result, add } = await run(withPanels([lensPanel(lensConfig)]));

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: VISUALIZATION_ATTACHMENT_TYPE,
        data: {
          renderer: 'lens',
          query: 'Panel "Requests" from dashboard "Web Traffic"',
          visualization: lensConfig,
          chart_type: 'metric',
          esql: 'FROM logs | STATS c = COUNT(*)',
        },
      })
    );
    expect(result).toMatchObject({
      type: ToolResultType.visualization,
      data: { attachment_id: 'viz-1', renderer: 'lens', chart_type: 'metric' },
    });
  });

  it.each([
    [
      'an untitled Lens copy after its primary metric',
      lensPanel({
        ...lensConfig,
        title: undefined,
        metrics: [{ type: 'primary', column: 'Errors' }],
      }),
      'Errors',
    ],
    [
      'an untitled custom copy after the pointer label',
      customPanel({ template: '<p>hi</p>' }),
      'Pointer label',
    ],
  ])('names %s', async (_, panel, name) => {
    const { add } = await run(withPanels([panel]));

    expect(add.mock.calls[0][0].data).toMatchObject({
      query: `Panel "${name}" from dashboard "Web Traffic"`,
    });
  });

  it.each([
    ['the id is not a pointer', { 'dashboard-1': dashboard([]) }, 'not a platform.dashboard.panel'],
    [
      'the pointed dashboard is missing',
      { [POINTER_ID]: pointer('panel-1', 'missing') },
      '"missing" named by the pointer is not in this conversation',
    ],
    ['the panel was removed', withPanels([]), 'no longer exists'],
    ['the custom panel has no template', withPanels([customPanel({})]), 'no template yet'],
    [
      'the Lens panel is not backed by ES|QL',
      withPanels([lensPanel({ type: 'metric' })]),
      'not backed by ES|QL',
    ],
    [
      'the Lens query reads a control variable',
      withPanels([
        lensPanel({
          type: 'metric',
          data_source: {
            type: 'esql',
            query: 'FROM logs | WHERE @timestamp >= ?_tstart AND host == ?host | STATS COUNT(*)',
          },
        }),
      ]),
      'reads dashboard control values (?host)',
    ],
    [
      'a custom panel query reads a control variable',
      withPanels([
        customPanel({ template: '<p/>', esql_query: ['FROM logs', 'FROM logs | KEEP ??field'] }),
      ]),
      'reads dashboard control values (?field)',
    ],
    [
      'the panel type is unsupported',
      withPanels([markdownPanel]),
      'cannot be shown as a visualization',
    ],
  ])('returns an error result when %s', async (_case, records, expected) => {
    const { result, add } = await run(records);

    expect(errorMessage(result)).toContain(expected);
    expect(add).not.toHaveBeenCalled();
  });

  it('returns an error result when persisting the attachment fails', async () => {
    const { result } = await run(withPanels([customPanel({ template: '<p>hi</p>' })]), {
      addError: new Error('boom'),
    });

    expect(errorMessage(result)).toContain('boom');
    expect(logger.error).toHaveBeenCalled();
  });
});
