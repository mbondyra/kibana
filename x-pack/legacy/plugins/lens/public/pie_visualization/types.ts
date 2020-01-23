/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LayerState {
  layerId: string;
  columns: string[];
}

export interface PieVisualizationState {
  shape: 'donut' | 'sunburst' | 'treemap';
  layers: LayerState[];
}
