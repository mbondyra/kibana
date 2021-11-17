/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Visualization } from '../../types';
import type { GaugeVisualizationState } from './types';
import { layerTypes } from '../../../common';
import { LensIconChartGaugeHorizontal } from '../../assets/chart_gauge';
import {
  GaugeShape,
  GaugeShapes,
  GaugeTicksPositions,
  GaugeTitleModes,
} from '../../../common/expressions/gauge_chart';

export const getSuggestions: Visualization<GaugeVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
  subVisualizationId,
}) => {
  if (
    table.isMultiRow ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.columns.length !== 1 ||
    table.columns?.[0]?.operation.dataType !== 'number' ||
    (state &&
      (state.minAccessor || state.maxAccessor || state.goalAccessor || state.metricAccessor) &&
      table.changeType !== 'extended' &&
      table.changeType !== 'unchanged')
  ) {
    return [];
  }

  const isSubChange =
    state?.shape === GaugeShapes.horizontalBullet || state?.shape === GaugeShapes.verticalBullet;
  const shape: GaugeShape =
    subVisualizationId === GaugeShapes.verticalBullet
      ? GaugeShapes.verticalBullet
      : GaugeShapes.horizontalBullet;

  const baseSuggestion = {
    state: {
      ...state,
      shape,
      layerId: table.layerId,
      metricAccessor: table.columns[0].columnId,
      layerType: layerTypes.DATA,
      ticksPosition: GaugeTicksPositions.auto,
      visTitleMode: GaugeTitleModes.auto,
    },
    title: i18n.translate('xpack.lens.gauge.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
    previewIcon: LensIconChartGaugeHorizontal,
    score: 0.1,
    hide: !isSubChange, // only display for gauges for beta
  };
  const suggestions = isSubChange
    ? [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            shape,
          },
        },
      ]
    : [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            shape: GaugeShapes.horizontalBullet,
          },
        },
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            shape: GaugeShapes.verticalBullet,
          },
        },
      ];

  return suggestions;
};
