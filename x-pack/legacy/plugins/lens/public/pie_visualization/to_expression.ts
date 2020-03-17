/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FramePublicAPI, Operation } from '../types';
import { PieVisualizationState } from './types';

export function toExpression(state: PieVisualizationState, frame: FramePublicAPI) {
  return expressionHelper(state, frame, false);
}

function expressionHelper(state: PieVisualizationState, frame: FramePublicAPI, isPreview: boolean) {
  const layer = state.layers[0];
  const datasource = frame.datasourceLayers[layer.layerId];
  const operations = layer.slices
    .map(columnId => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
    .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);
  if (!layer.metric || !operations.length) {
    return null;
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_pie',
        arguments: {
          shape: [state.shape],
          hideLabels: [isPreview],
          slices: operations.map(o => o.columnId),
          metric: [layer.metric],
        },
      },
    ],
  };
}

export function toPreviewExpression(state: PieVisualizationState, frame: FramePublicAPI) {
  return expressionHelper(state, frame, true);
}
