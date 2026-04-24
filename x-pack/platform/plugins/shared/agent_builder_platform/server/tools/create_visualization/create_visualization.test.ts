/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { buildVisualizationConfig } from '@kbn/agent-builder-genai-utils';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createVisualizationTool } from './create_visualization';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  buildVisualizationConfig: jest.fn(),
}));

const mockedBuildVisualizationConfig = jest.mocked(buildVisualizationConfig);

const createMockAttachments = ({
  screenContextTimeRange,
}: {
  screenContextTimeRange?: { from: string; to: string };
} = {}) => {
  const add = jest.fn().mockResolvedValue({
    id: 'new-visualization',
    current_version: 1,
  });

  const getActive = jest.fn(() =>
    screenContextTimeRange
      ? [
          {
            id: 'screen-context',
            type: AttachmentType.screenContext,
            current_version: 1,
            versions: [
              {
                version: 1,
                data: { time_range: screenContextTimeRange },
                created_at: new Date().toISOString(),
                content_hash: 'mock',
                estimated_tokens: 0,
              },
            ],
          },
        ]
      : []
  );

  const attachments = {
    add,
    getActive,
    getAttachmentRecord: jest.fn(),
    update: jest.fn(),
  } as unknown as AttachmentStateManager & {
    add: jest.Mock;
    getActive: jest.Mock;
    getAttachmentRecord: jest.Mock;
    update: jest.Mock;
  };

  return { attachments, add };
};

const createHandlerContext = (attachments: AttachmentStateManager) => ({
  esClient: {} as any,
  modelProvider: {} as any,
  logger: loggingSystemMock.createLogger(),
  events: {} as any,
  attachments,
});

describe('createVisualizationTool', () => {
  beforeEach(() => {
    mockedBuildVisualizationConfig.mockReset();
    mockedBuildVisualizationConfig.mockResolvedValue({
      selectedChartType: SupportedChartType.Pie,
      validatedConfig: { type: 'pie' },
      esqlQuery: 'FROM kibana_sample_data_ecommerce | STATS count = COUNT(*) BY category',
      timeRange: { from: 'now-7d', to: 'now' },
    } as Awaited<ReturnType<typeof buildVisualizationConfig>>);
  });

  it('prefers the screen context time range over the generated time range', async () => {
    const { attachments, add } = createMockAttachments({
      screenContextTimeRange: { from: 'now-24h', to: 'now' },
    });

    const tool = createVisualizationTool();
    const result = await tool.handler(
      {
        query: 'Show orders by category',
      },
      createHandlerContext(attachments) as any
    );

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          time_range: { from: 'now-24h', to: 'now' },
        }),
      })
    );
    expect(mockedBuildVisualizationConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: { from: 'now-24h', to: 'now' },
      })
    );

    expect(result.results).toContainEqual(
      expect.objectContaining({
        type: ToolResultType.visualization,
        data: expect.objectContaining({
          time_range: { from: 'now-24h', to: 'now' },
        }),
      })
    );
  });

  it('prefers an explicit time range over screen context', async () => {
    const { attachments, add } = createMockAttachments({
      screenContextTimeRange: { from: 'now-24h', to: 'now' },
    });

    const tool = createVisualizationTool();
    const result = await tool.handler(
      {
        query: 'Show orders by category',
        time_range: { from: 'now-1h', to: 'now' },
      },
      createHandlerContext(attachments) as any
    );

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          time_range: { from: 'now-1h', to: 'now' },
        }),
      })
    );
    expect(mockedBuildVisualizationConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: { from: 'now-1h', to: 'now' },
      })
    );

    expect(result.results).toContainEqual(
      expect.objectContaining({
        type: ToolResultType.visualization,
        data: expect.objectContaining({
          time_range: { from: 'now-1h', to: 'now' },
        }),
      })
    );
  });

  it('falls back to the generated time range when no other range is available', async () => {
    const { attachments, add } = createMockAttachments();

    const tool = createVisualizationTool();
    const result = await tool.handler(
      {
        query: 'Show orders by category',
      },
      createHandlerContext(attachments) as any
    );

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          time_range: { from: 'now-7d', to: 'now' },
        }),
      })
    );

    expect(result.results).toContainEqual(
      expect.objectContaining({
        type: ToolResultType.visualization,
        data: expect.objectContaining({
          time_range: { from: 'now-7d', to: 'now' },
        }),
      })
    );
  });
});
