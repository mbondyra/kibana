/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGaugeVisualization, isNumericMetric } from './visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { GROUP_ID } from './constants';
import type { GaugeVisualizationState } from './types';
import type { DatasourcePublicAPI, Operation } from '../../types';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { layerTypes } from '../../../common';
import { GAUGE_FUNCTION } from '../../../common/expressions/gauge_chart';

function exampleState(): GaugeVisualizationState {
  return {
    layerId: 'test-layer',
    layerType: layerTypes.DATA,
    visTitleMode: 'auto',
    ticksPosition: 'auto',
    shape: 'horizontalBullet',
  };
}

const paletteService = chartPluginMock.createPaletteRegistry();

describe('gauge', () => {
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
  });

  describe('#intialize', () => {
    test('returns a default state', () => {
      expect(getGaugeVisualization({ paletteService }).initialize(() => 'l1')).toEqual({
        layerId: 'l1',
        layerType: layerTypes.DATA,
        title: 'Empty Gauge chart',
        shape: 'horizontalBullet',
        visTitleMode: 'auto',
        ticksPosition: 'auto',
      });
    });

    test('returns persisted state', () => {
      expect(
        getGaugeVisualization({ paletteService }).initialize(() => 'test-layer', exampleState())
      ).toEqual(exampleState());
    });
  });

  describe('#getConfiguration', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    afterEach(() => {
      // some tests manipulate it, so restore a pristine version
      frame = createMockFramePublicAPI();
    });

    test('resolves configuration from complete state and available data', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'v-accessor',
        minAccessor: 'minAccessor',
        maxAccessor: 'maxAccessor',
        goalAccessor: 'g-accessor',
      };

      frame.activeData = { first: { type: 'datatable', columns: [], rows: [] } };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Horizontal axis',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_xDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Vertical axis',
            accessors: [{ columnId: 'y-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsGauge_yDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Cell value',
            accessors: [
              {
                columnId: 'v-accessor',
                triggerIcon: 'colorBy',
                palette: [
                  { color: 'blue', stop: 100 },
                  { color: 'yellow', stop: 350 },
                ],
              },
            ],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_cellPanel',
            enableDimensionEditor: true,
          },
        ],
      });
    });

    test('resolves configuration from partial state', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'minAccessor',
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Horizontal axis',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_xDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Vertical axis',
            accessors: [],
            filterOperations: isNumericMetric,
            supportsMoreColumns: true,
            required: false,
            dataTestSubj: 'lnsGauge_yDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Cell value',
            accessors: [],
            filterOperations: isNumericMetric,
            supportsMoreColumns: true,
            required: true,
            dataTestSubj: 'lnsGauge_cellPanel',
            enableDimensionEditor: true,
          },
        ],
      });
    });

    test("resolves configuration when there's no access to active data in frame", () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'v-accessor',
        minAccessor: 'minAccessor',
        maxAccessor: 'maxAccessor',
        goalAccessor: 'g-accessor',
      };

      frame.activeData = undefined;

      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Horizontal axis',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_xDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Vertical axis',
            accessors: [{ columnId: 'y-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsGauge_yDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Cell value',
            accessors: [
              {
                columnId: 'v-accessor',
                triggerIcon: 'none',
              },
            ],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_cellPanel',
            enableDimensionEditor: true,
          },
        ],
      });
    });
  });

  describe('#setDimension', () => {
    test('set dimension correctly', () => {
      const prevState: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'minAccessor',
        maxAccessor: 'maxAccessor',
      };
      expect(
        getGaugeVisualization({
          paletteService,
        }).setDimension({
          prevState,
          layerId: 'first',
          columnId: 'new-min-accessor',
          groupId: 'x',
          frame,
        })
      ).toEqual({
        ...prevState,
        minAccessor: 'new-min-accessor',
      });
    });
  });

  describe('#removeDimension', () => {
    test('removes dimension correctly', () => {
      const prevState: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'minAccessor',
        maxAccessor: 'maxAccessor',
      };
      expect(
        getGaugeVisualization({
          paletteService,
        }).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'min-accessor',
          frame,
        })
      ).toEqual({
        ...exampleState(),
        maxAccessor: 'maxAccessor',
      });
    });
  });

  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(
        getGaugeVisualization({
          paletteService,
        }).getSupportedLayers()
      ).toHaveLength(1);
    });
  });

  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'minAccessor',
        goalAccessor: 'value-accessor',
      };
      const instance = getGaugeVisualization({
        paletteService,
      });
      expect(instance.getLayerType('test-layer', state)).toEqual(layerTypes.DATA);
      expect(instance.getLayerType('foo', state)).toBeUndefined();
    });
  });

  describe('#toExpression', () => {
    let datasourceLayers: Record<string, DatasourcePublicAPI>;

    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('creates an expression based on state and attributes', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'minAccessor',
        goalAccessor: 'value-accessor',
      };
      const attributes = {
        title: 'Test',
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).toExpression(state, datasourceLayers, attributes)
      ).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: GAUGE_FUNCTION,
            arguments: {
              title: ['Test'],
              description: [''],
              minAccessor: ['min-accessor'],
              yAccessor: [''],
              goalAccessor: ['value-accessor'],
              palette: [
                {
                  type: 'expression',
                  chain: [
                    {
                      arguments: {
                        name: ['mocked'],
                      },
                      type: 'function',
                      function: 'system_palette',
                    },
                  ],
                },
              ],
              visTitleMode: ['auto'],
              ticksPosition: ['auto'],
            },
          },
        ],
      });
    });

    test('returns null with a missing value accessor', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'minAccessor',
      };
      const attributes = {
        title: 'Test',
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).toExpression(state, datasourceLayers, attributes)
      ).toEqual(null);
    });
  });

  describe('#toPreviewExpression', () => {
    let datasourceLayers: Record<string, DatasourcePublicAPI>;

    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('creates a preview expression based on state and attributes', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'minAccessor',
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).toPreviewExpression!(state, datasourceLayers)
      ).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: GAUGE_FUNCTION,
            arguments: {
              title: [''],
              description: [''],
              minAccessor: ['min-accessor'],
              yAccessor: [''],
              goalAccessor: [''],
              palette: [
                {
                  type: 'expression',
                  chain: [
                    {
                      arguments: {
                        name: ['mocked'],
                      },
                      type: 'function',
                      function: 'system_palette',
                    },
                  ],
                },
              ],
              visTitleMode: ['auto'],
              ticksPosition: ['auto'],
            },
          },
        ],
      });
    });
  });

  describe('#getErrorMessages', () => {
    test('should not return an error when chart has empty configuration', () => {
      const mockState = {
        shape: 'horizontalBullet',
      } as GaugeVisualizationState;
      expect(
        getGaugeVisualization({
          paletteService,
        }).getErrorMessages(mockState)
      ).toEqual(undefined);
    });

    test('should return an error when the X accessor is missing', () => {
      const mockState = {
        shape: 'horizontalBullet',
        goalAccessor: 'v-accessor',
      } as GaugeVisualizationState;
      expect(
        getGaugeVisualization({
          paletteService,
        }).getErrorMessages(mockState)
      ).toEqual([
        {
          longMessage: 'Configuration for the horizontal axis is missing.',
          shortMessage: 'Missing Horizontal axis.',
        },
      ]);
    });
  });

  describe('#getWarningMessages', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('should not return warning messages when the layer it not configured', () => {
      const mockState = {
        shape: 'horizontalBullet',
        goalAccessor: 'v-accessor',
      } as GaugeVisualizationState;
      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(mockState, frame)
      ).toEqual(undefined);
    });

    test('should not return warning messages when the data table is empty', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [],
          columns: [],
        },
      };
      const mockState = {
        shape: 'horizontalBullet',
        goalAccessor: 'v-accessor',
        layerId: 'first',
      } as GaugeVisualizationState;
      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(mockState, frame)
      ).toEqual(undefined);
    });

    test('should return a warning message when cell value data contains arrays', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [
            {
              'v-accessor': [1, 2, 3],
            },
          ],
          columns: [],
        },
      };

      const mockState = {
        shape: 'horizontalBullet',
        goalAccessor: 'v-accessor',
        layerId: 'first',
      } as GaugeVisualizationState;
      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(mockState, frame)
      ).toHaveLength(1);
    });
  });
});
