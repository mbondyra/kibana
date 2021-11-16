/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Visualization } from '../../types';
import type { GaugeVisualizationState } from './types';
import { GAUGE_APPEARANCE_FUNCTION } from './constants';
import { layerTypes } from '../../../common';
import { LensIconChartGaugeHorizontal } from '../../assets/chart_gauge';
import { GoalSubtype } from '@elastic/charts/dist/chart_types/goal_chart/specs/constants';

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
      (state.minAccessor || state.maxAccessor || state.goalAccessor || state.metricAccessor)  &&
          table.changeType !== 'extended' &&
          table.changeType !== 'unchanged')
  ) {
    return [];
  }

  const baseSuggestion = {
    state: {
      ...state,
      shape: subVisualizationId || GoalSubtype.HorizontalBullet,
      layerId: table.layerId,
      metricAccessor: table.columns[0].columnId,
      layerType: layerTypes.DATA,
      appearance: {
        type: GAUGE_APPEARANCE_FUNCTION,
        ticksPosition: 'auto',
        titleMode: 'auto',
      },
    },
    title: i18n.translate('xpack.lens.gauge.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
    previewIcon: LensIconChartGaugeHorizontal,
    score: 0.1,
    hide: !(state?.shape === 'horizontalBullet' || state?.shape === 'verticalBullet'), // only display for gauges for beta
  };
  const suggestions =
    state?.shape === 'horizontalBullet' || state?.shape === 'verticalBullet'
      ? [
          {
            ...baseSuggestion,
            state: {
              ...baseSuggestion.state,
              shape: state.shape === 'horizontalBullet' ? 'verticalBullet' : 'horizontalBullet',
            },
          },
        ]
      : [
          {
            ...baseSuggestion,
            state: {
              ...baseSuggestion.state,
              shape: 'horizontalBullet',
            },
          },
          {
            ...baseSuggestion,
            state: {
              ...baseSuggestion.state,
              shape: 'verticalBullet',
            },
          },
        ];

  return suggestions;
};
