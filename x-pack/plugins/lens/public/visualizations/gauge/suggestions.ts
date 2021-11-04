/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { Visualization } from '../../types';
import type { GaugeVisualizationState } from './types';
import { GAUGE_APPEARANCE_FUNCTION } from './constants';
import { layerTypes } from '../../../common';

export const getSuggestions: Visualization<GaugeVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
}) => {
  if (
    state &&
    (state.minAccessor || state.maxAccessor || state.goalAccessor || state.metricAccessor) &&
    table.changeType !== 'extended'
  ) {
    return [];
  }

  const isUnchanged = state && table.changeType === 'unchanged';

  if (
    isUnchanged ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0])
  ) {
    return [];
  }

  /**
   * The score gets increased based on the config completion.
   */
  let score = 0;

  const [groups, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  if (groups.length >= 3) {
    return [];
  }
  console.log(groups, metrics);

  const isSingleBucketDimension = groups.length === 1 && metrics.length === 0;

  /**
   * Hide for:
   * - reduced and reorder tables
   * - tables with just a single bucket dimension
   */
  const hide =
    table.changeType === 'reduced' || table.changeType === 'reorder' || isSingleBucketDimension;

  const newState: GaugeVisualizationState = {
    shape: 'horizontalBullet',
    layerId: table.layerId,
    layerType: layerTypes.DATA,
    appearance: {
      type: GAUGE_APPEARANCE_FUNCTION,
      ticksPosition: 'auto',
      titleMode: 'auto',
      // subtitle: '', //todo
    },
  };

  const numberMetric = metrics.find((m) => m.operation.dataType === 'number');

  if (numberMetric) {
    score += 0.3;
    newState.metricAccessor = numberMetric.columnId;
  }

  // const [histogram, ordinal] = partition(groups, (g) => g.operation.scale === 'interval');

  // newState.minAccessor = histogram[0]?.columnId || ordinal[0]?.columnId;
  // newState.maxAccessor = groups.find((g) => g.columnId !== newState.minAccessor)?.columnId;

  // if (newState.minAccessor) {
  //   score += 0.3;
  // }
  // if (newState.maxAccessor) {
  //   score += 0.3;
  // }

  return [
    {
      state: newState,
      title: i18n.translate('xpack.lens.gauge.gaugeLabel', {
        defaultMessage: 'Gauge',
      }),
      // Temp hide all suggestions while gauge is in beta
      hide: true || hide,
      previewIcon: 'empty',
      score: Number(score.toFixed(1)),
    },
  ];
};
