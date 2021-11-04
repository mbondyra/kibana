/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './suggestions';
import type { GaugeVisualizationState } from './types';
import { GAUGE_APPEARANCE_FUNCTION } from './constants';
import { layerTypes } from '../../../common';

describe('gauge suggestions', () => {
  describe('rejects suggestions', () => {
    test('when currently active and unchanged data', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: {
            shape: 'horizontalBullet',
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    test('when there are 3 or more buckets', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'date-column-01',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'date-column-02',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'another-bucket-column',
                operation: {
                  isBucketed: true,
                  dataType: 'string',
                  scale: 'ratio',
                  label: 'Bucket',
                },
              },
              {
                columnId: 'metric-column',
                operation: {
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  label: 'Metric',
                },
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([]);
    });

    test('when currently active with partial configuration and not extended change type', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'initial',
          },
          state: {
            shape: 'horizontalBullet',
            layerId: 'first',
            layerType: layerTypes.DATA,
            minAccessor: 'some-field',
            appearance: {
              titleMode: 'auto',
              ticksPosition: 'auto',
            },
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });
  });

  describe('hides suggestions', () => {
    test('when table is reduced', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'reduced',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
            shape: 'horizontalBullet',
            appearance: {
              type: GAUGE_APPEARANCE_FUNCTION,
              titleMode: 'auto',
              ticksPosition: 'auto',
            },
          },
          title: 'Gauge',
          hide: true,
          previewIcon: 'empty',
          score: 0,
        },
      ]);
    });
    test('for tables with a single bucket dimension', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'test-column',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
            ],
            changeType: 'reduced',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
            shape: 'horizontalBullet',
            minAccessor: 'test-column',
            appearance: {
              type: GAUGE_APPEARANCE_FUNCTION,
              titleMode: 'auto',
              ticksPosition: 'auto',
            },
          },
          title: 'Gauge',
          hide: true,
          previewIcon: 'empty',
          score: 0.3,
        },
      ]);
    });
  });

  describe('shows suggestions', () => {
    test('when at least one axis and value accessor are available', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'date-column',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'metric-column',
                operation: {
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  label: 'Metric',
                },
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
            shape: 'horizontalBullet',
            minAccessor: 'date-column',
            goalAccessor: 'metric-column',
            appearance: {
              type: GAUGE_APPEARANCE_FUNCTION,
              titleMode: 'auto',
              ticksPosition: 'auto',
            },
          },
          title: 'Gauge',
          // Temp hide all suggestions while gauge is in beta
          hide: true,
          previewIcon: 'empty',
          score: 0.6,
        },
      ]);
    });

    test('when complete configuration has been resolved', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'date-column',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'metric-column',
                operation: {
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  label: 'Metric',
                },
              },
              {
                columnId: 'group-column',
                operation: {
                  isBucketed: true,
                  dataType: 'string',
                  scale: 'ratio',
                  label: 'Group',
                },
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
            shape: 'horizontalBullet',
            minAccessor: 'date-column',
            yAccessor: 'group-column',
            goalAccessor: 'metric-column',
            appearance: {
              type: GAUGE_APPEARANCE_FUNCTION,
              titleMode: 'auto',
              ticksPosition: 'auto',
            },
          },
          title: 'Gauge',
          // Temp hide all suggestions while gauge is in beta
          hide: true,
          previewIcon: 'empty',
          score: 0.9,
        },
      ]);
    });
  });
});
