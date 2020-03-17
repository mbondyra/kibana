/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  SuggestionRequest,
  Visualization,
  VisualizationSuggestion,
  OperationMetadata,
} from '../types';
import { toExpression, toPreviewExpression } from './to_expression';
import { LayerState, PieVisualizationState } from './types';

function newLayerState(layerId: string): LayerState {
  return {
    layerId,
    slices: [],
    metric: undefined,
  };
}

const allOperations = () => true;
const numberMetricOperations = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

export const pieVisualization: Visualization<PieVisualizationState, PieVisualizationState> = {
  id: 'lnsPie',

  visualizationTypes: [
    {
      id: 'donut',
      icon: 'bullseye',
      label: i18n.translate('xpack.lens.pie.donutLabel', {
        defaultMessage: 'Donut',
      }),
    },
    {
      id: 'pie',
      icon: 'visPie',
      label: i18n.translate('xpack.lens.pie.pielabel', {
        defaultMessage: 'Pie',
      }),
    },
    {
      id: 'treemap',
      icon: 'grid',
      label: i18n.translate('xpack.lens.pie.treemaplabel', {
        defaultMessage: 'Treemap',
      }),
    },
  ],

  getLayerIds(state) {
    return state.layers.map(l => l.layerId);
  },

  clearLayer(state) {
    return {
      shape: state.shape,
      layers: state.layers.map(l => newLayerState(l.layerId)),
    };
  },

  getDescription(state) {
    if (state.shape === 'donut') {
      return {
        icon: 'bullseye',
        label: i18n.translate('xpack.lens.pie.donutLabel', {
          defaultMessage: 'Donut',
        }),
      };
    } else if (state.shape === 'pie') {
      return {
        icon: 'visPie',
        label: i18n.translate('xpack.lens.pie.pieLabel', {
          defaultMessage: 'Pie',
        }),
      };
    }
    return {
      icon: 'grid',
      label: i18n.translate('xpack.lens.pie.treemapLabel', {
        defaultMessage: 'Treemap',
      }),
    };
  },

  switchVisualizationType: (visualizationTypeId, state) => ({
    ...state,
    shape: visualizationTypeId as PieVisualizationState['shape'],
  }),

  initialize(frame, state) {
    return (
      state || {
        shape: 'donut',
        layers: [newLayerState(frame.addNewLayer())],
      }
    );
  },

  getPersistableState: state => state,

  getSuggestions({
    table,
    state,
    keptLayerIds,
  }: SuggestionRequest<PieVisualizationState>): Array<
    VisualizationSuggestion<PieVisualizationState>
  > {
    if (
      keptLayerIds.length > 1 ||
      (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
      (state && table.changeType === 'unchanged') ||
      table.columns.some(col => col.operation.dataType === 'date')
    ) {
      return [];
    }

    const [slices, metrics] = partition(table.columns, col => col.operation.isBucketed);

    if (slices.length === 0 || metrics.length > 1) {
      return [];
    }

    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.pie.donutSuggestionLabel', {
            defaultMessage: 'As donut',
          })
        : i18n.translate('xpack.len.pie.donutSuggestionOf', {
            defaultMessage: 'Donut {operations}',
            values: {
              operations:
                table.label ||
                table.columns
                  .map(col => col.operation.label)
                  .join(
                    i18n.translate('xpack.lens.datatable.conjunctionSign', {
                      defaultMessage: ' & ',
                      description:
                        'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
                    })
                  ),
            },
          });

    return [
      {
        title,
        score: 0.6,
        state: {
          shape: state ? state.shape : 'donut',
          layers: [
            {
              layerId: table.layerId,
              slices: slices.map(col => col.columnId),
              metric: metrics[0].columnId,
            },
          ],
        },
        previewIcon: 'bullseye',
        // dont show suggestions for reduced versions or single-line tables
        hide: table.changeType === 'reduced',
      },
    ];
  },

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find(l => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const datasource = frame.datasourceLayers[layer.layerId];
    const originalOrder = datasource
      .getTableSpec()
      .map(({ columnId }) => columnId)
      .filter(columnId => columnId !== layer.metric);
    // When we add a column it could be empty, and therefore have no order
    const sortedColumns = Array.from(new Set(originalOrder.concat(layer.slices)));

    return {
      groups: [
        {
          groupId: 'slices',
          groupLabel: i18n.translate('xpack.lens.pie.slices', {
            defaultMessage: 'Slices',
          }),
          layerId,
          accessors: sortedColumns,
          supportsMoreColumns: true,
          filterOperations: allOperations,
          required: true,
        },
        {
          groupId: 'metric',
          groupLabel: i18n.translate('xpack.lens.pie.metric', {
            defaultMessage: 'Metric',
          }),
          layerId,
          accessors: layer.metric ? [layer.metric] : [],
          supportsMoreColumns: !layer.metric,
          filterOperations: numberMetricOperations,
          required: true,
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId }) {
    return {
      ...prevState,
      layers: prevState.layers.map(l => {
        if (l.layerId !== layerId) {
          return l;
        }
        if (groupId === 'slices') {
          return {
            ...l,
            slices: [...l.slices, columnId],
          };
        }
        return { ...l, metric: columnId };
      }),
    };
  },
  removeDimension({ prevState, layerId, columnId }) {
    return {
      ...prevState,
      layers: prevState.layers.map(l => {
        if (l.layerId !== layerId) {
          return l;
        }

        if (l.metric === columnId) {
          return {
            ...l,
            metric: undefined,
          };
        }
        return {
          ...l,
          slices: l.slices.filter(c => c !== columnId),
        };
      }),
    };
  },

  toExpression,
  toPreviewExpression,
};
