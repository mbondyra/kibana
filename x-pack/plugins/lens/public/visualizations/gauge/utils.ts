/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { Datatable } from 'src/plugins/expressions';
import { applyPaletteParams, findMinMaxByColumnId } from '../../shared_components';
import { DEFAULT_PALETTE_NAME } from './constants';
import type { GaugeVisualizationState } from './types';

export function getSafePaletteParams(
  paletteService: PaletteRegistry,
  currentData: Datatable | undefined,
  accessor: string | undefined,
  activePalette?: GaugeVisualizationState['palette']
) {
  if (currentData == null || accessor == null) {
    return { displayStops: [], activePalette: {} as GaugeVisualizationState['palette'] };
  }
  const finalActivePalette: GaugeVisualizationState['palette'] = activePalette ?? {
    type: 'palette',
    name: DEFAULT_PALETTE_NAME,
    accessor,
  };
  const minMaxByColumnId = findMinMaxByColumnId([accessor], currentData);
  const currentMinMax = minMaxByColumnId[accessor];

  // need to tell the helper that the colorStops are required to display
  return {
    displayStops: applyPaletteParams(paletteService, finalActivePalette, currentMinMax),
    currentMinMax,
    activePalette: finalActivePalette,
  };
}

type GaugeAccessors = 'maxAccessor' | 'minAccessor' | 'goalAccessor' | 'metricAccessor';

type GaugeAccessorsType = Pick<GaugeVisualizationState, GaugeAccessors>;

export const getValueFromAccessor = (
  accessorName: GaugeAccessors,
  row?: Record<string, any>,
  state?: GaugeAccessorsType
) => {
  if (row && state) {
    const accessor = state[accessorName];
    const value = accessor && row[accessor];
    if (typeof value === 'number') {
      return value;
    }
  }
};

export const getMaxValue = (row?: Record<string, any>, state?: GaugeAccessorsType) => {
  const FALLBACK_VALUE = 100;
  const MAX_FACTOR = 1.66;
  const currentValue = getValueFromAccessor('maxAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  if (row && state) {
    const { metricAccessor, goalAccessor } = state;
    const metricValue = metricAccessor && row[metricAccessor];
    const goalValue = goalAccessor && row[goalAccessor];
    if (metricValue) {
      return Math.round(Math.max(goalValue || 0, metricValue) * MAX_FACTOR) || FALLBACK_VALUE;
    }
  }
  return FALLBACK_VALUE;
};

export const getMinValue = (row?: Record<string, any>, state?: GaugeAccessorsType) => {
  const currentValue = getValueFromAccessor('minAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const FALLBACK_VALUE = 0;
  if (row && state) {
    const { metricAccessor } = state;
    const metricValue = metricAccessor && row[metricAccessor];
    if (metricValue < 0) {
      return metricValue - 10; // TO THINK THROUGH
    }
  }
  return FALLBACK_VALUE;
};

export const getMetricValue = (row?: Record<string, any>, state?: GaugeAccessorsType) => {
  const currentValue = getValueFromAccessor('metricAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const minValue = getMinValue(row, state);
  const maxValue = getMaxValue(row, state);
  return Math.round((minValue + maxValue) * 0.6);
};

export const getGoalValue = (row?: Record<string, any>, state?: GaugeVisualizationState) => {
  const currentValue = getValueFromAccessor('goalAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const minValue = getMinValue(row, state);
  const maxValue = getMaxValue(row, state);
  return Math.round((minValue + maxValue) * 0.8);
};
