/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FramePublicAPI, Operation } from '../types';
import { PieVisualizationState } from './types';

export function toExpression(state: PieVisualizationState, frame: FramePublicAPI) {
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
          shape: [state.shape],
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
}

export function toPreviewExpression(state: PieVisualizationState, frame: FramePublicAPI) {
  return toExpression(
    {
      ...state,
      layers: state.layers.map(layer => ({ ...layer, hide: true })),
      // hide legend for preview
      // legend: {
      //   ...state.legend,
      //   isVisible: false,
      // },
    },
    frame
  );
}
