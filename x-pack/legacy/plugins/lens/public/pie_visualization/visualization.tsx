/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { MultiColumnEditor } from '../multi_column_editor';
import {
  SuggestionRequest,
  Visualization,
  VisualizationLayerConfigProps,
  VisualizationSuggestion,
  Operation,
} from '../types';
import { generateId } from '../id_generator';

export interface LayerState {
  layerId: string;
  columns: string[];
}

export interface PieVisualizationState {
  layers: LayerState[];
}

function newLayerState(layerId: string): LayerState {
  return {
    layerId,
    columns: [generateId()],
  };
}

function updateColumns(
  state: PieVisualizationState,
  layer: LayerState,
  fn: (columns: string[]) => string[]
) {
  const columns = fn(layer.columns);
  const updatedLayer = { ...layer, columns };
  const layers = state.layers.map(l => (l.layerId === layer.layerId ? updatedLayer : l));
  return { ...state, layers };
}

const allOperations = () => true;

export function PieLayer({
  layer,
  frame,
  state,
  setState,
  dragDropContext,
}: { layer: LayerState } & VisualizationLayerConfigProps<PieVisualizationState>) {
  const datasource = frame.datasourceLayers[layer.layerId];

  const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
  // When we add a column it could be empty, and therefore have no order
  const sortedColumns = Array.from(new Set(originalOrder.concat(layer.columns)));

  return (
    <EuiFormRow
      className="lnsConfigPanel__axis"
      label={i18n.translate('xpack.lens.pie.columns', { defaultMessage: 'Columns' })}
    >
      <MultiColumnEditor
        accessors={sortedColumns}
        datasource={datasource}
        dragDropContext={dragDropContext}
        filterOperations={allOperations}
        layerId={layer.layerId}
        onAdd={() => setState(updateColumns(state, layer, columns => [...columns, generateId()]))}
        onRemove={column =>
          setState(updateColumns(state, layer, columns => columns.filter(c => c !== column)))
        }
        testSubj="pie_columns"
        data-test-subj="pie_multicolumnEditor"
      />
    </EuiFormRow>
  );
}

export const pieVisualization: Visualization<PieVisualizationState, PieVisualizationState> = {
  id: 'lnsPie',

  visualizationTypes: [
    {
      id: 'lnsPie',
      icon: 'visPie',
      // largeIcon: chartTableSVG,
      label: i18n.translate('xpack.lens.pie.label', {
        defaultMessage: 'Pie',
      }),
    },
  ],

  getLayerIds(state) {
    return state.layers.map(l => l.layerId);
  },

  clearLayer(state) {
    return {
      layers: state.layers.map(l => newLayerState(l.layerId)),
    };
  },

  getDescription() {
    return {
      // icon: chartTableSVG,
      label: i18n.translate('xpack.lens.pie.label', {
        defaultMessage: 'Pie',
      }),
    };
  },

  switchVisualizationType: (_, state) => state,

  initialize(frame, state) {
    return (
      state || {
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
      (state && table.changeType === 'unchanged')
    ) {
      return [];
    }
    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.datatable.suggestionLabel', {
            defaultMessage: 'As table',
          })
        : i18n.translate('xpack.lens.datatable.visualizationOf', {
            defaultMessage: 'Table {operations}',
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
        // table with >= 10 columns will have a score of 0.6, fewer columns reduce score
        score: (Math.min(table.columns.length, 10) / 10) * 0.6,
        state: {
          layers: [
            {
              layerId: table.layerId,
              columns: table.columns.map(col => col.columnId),
            },
          ],
        },
        previewIcon: 'visPie',
        // previewIcon: chartTableSVG,
        // dont show suggestions for reduced versions or single-line tables
        hide: table.changeType === 'reduced' || !table.isMultiRow,
      },
    ];
  },

  renderLayerConfigPanel(domElement, props) {
    const layer = props.state.layers.find(l => l.layerId === props.layerId);

    if (layer) {
      render(
        <I18nProvider>
          <PieLayer {...props} layer={layer} />
        </I18nProvider>,
        domElement
      );
    }
  },

  toExpression(state, frame) {
    const layer = state.layers[0];
    const datasource = frame.datasourceLayers[layer.layerId];
    const operations = layer.columns
      .map(columnId => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
      .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_pie',
          arguments: {
            columns: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: 'lens_pie_columns',
                    arguments: {
                      columnIds: operations.map(o => o.columnId),
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },
};
