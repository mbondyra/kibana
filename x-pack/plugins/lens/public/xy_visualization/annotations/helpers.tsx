/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { layerTypes } from '../../../common';
import type { XYDataLayerConfig, XYAnnotationLayerConfig } from '../../../common/expressions';
import type { AccessorConfig, FramePublicAPI, Visualization } from '../../types';
import { isHorizontalChart } from '../state_helpers';
import type { XYState } from '../types';
import {
  checkScaleOperation,
  getAxisName,
  getDataLayers,
  isAnnotationsLayer,
} from '../visualization_helpers';
import { LensIconChartBarAnnotations } from '../../assets/chart_bar_annotations';
import { generateId } from '../../id_generator';

const MAX_DATE = Number(new Date(8640000000000000));
const MIN_DATE = Number(new Date(-8640000000000000));

// TODO with date
export function getStaticDate(
  dataLayers: XYDataLayerConfig[],
  activeData: FramePublicAPI['activeData']
) {
  const fallbackValue = +new Date(Date.now()); // TODO: get it from timepicker
  if (!activeData) {
    return fallbackValue;
  }
  const dataLayersId = dataLayers.map(({ layerId }) => layerId); // TODO empty active data? one time bucket? etc
  const minDate = dataLayersId.reduce((acc, lId) => {
    const xAccessor = dataLayers.find((dataLayer) => dataLayer.layerId === lId)?.xAccessor!;
    const layerMinTimestamp = activeData[lId]?.rows?.[0]?.[xAccessor];
    if (layerMinTimestamp && layerMinTimestamp < acc) {
      return layerMinTimestamp;
    }
    return acc;
  }, MAX_DATE);

  const maxDate = dataLayersId.reduce((acc, lId) => {
    const xAccessor = dataLayers.find((dataLayer) => dataLayer.layerId === lId)?.xAccessor!;
    const layerMinTimestamp =
      activeData[lId]?.rows?.[activeData?.[lId]?.rows?.length - 1]?.[xAccessor];
    if (layerMinTimestamp && layerMinTimestamp > acc) {
      return layerMinTimestamp;
    }
    return acc;
  }, MIN_DATE);
  const middleDate = (minDate + maxDate) / 2;
  return middleDate;
}

export const getAnnotationsSupportedLayer = (
  state?: XYState,
  frame?: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>
) => {
  const dataLayers = getDataLayers(state?.layers || []);

  const hasDateHistogram = dataLayers.every(
    (dataLayer) =>
      dataLayer.xAccessor ||
      checkScaleOperation('interval', 'date', frame?.datasourceLayers || {})(dataLayer)
  );

  // TODO initial time
  const initialDimensions =
    state && hasDateHistogram
      ? [
          {
            groupId: 'xAnnotations',
            columnId: generateId(),
          },
        ]
      : undefined;

  return {
    type: layerTypes.ANNOTATIONS,
    label: i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabel', {
      defaultMessage: 'Annotations lines',
    }),
    icon: LensIconChartBarAnnotations,
    disabled: !hasDateHistogram,
    toolTipContent: !hasDateHistogram
      ? i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp', {
          defaultMessage: 'Annotations require a time based chart to work. Add a date histogram.',
        })
      : undefined,
    initialDimensions,
  };
};
export const setAnnotationsDimension: Visualization<XYState>['setDimension'] = ({
  prevState,
  layerId,
  columnId,
  previousColumn,
  frame,
}) => {
  const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
  if (!foundLayer || !isAnnotationsLayer(foundLayer)) {
    return prevState;
  }
  const dataLayers = getDataLayers(prevState.layers);
  const newLayer = { ...foundLayer } as XYAnnotationLayerConfig;

  newLayer.accessors = [...newLayer.accessors.filter((a) => a !== columnId), columnId];
  const hasConfig = newLayer.config?.some(({ id }) => id === columnId);
  const previousConfig = previousColumn
    ? newLayer.config?.find(({ id }) => id === previousColumn)
    : false;
  if (!hasConfig) {
    newLayer.config = [
      ...(newLayer.config || []),
      {
        label: i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
          defaultMessage: 'Static Annotation',
        }),
        key: {
          type: 'annotation_key',
          keyType: 'point_in_time',
          timestamp: getStaticDate(dataLayers, frame?.activeData),
        },
        ...previousConfig,
        id: columnId,
        axisMode: 'bottom',
      },
    ];
  }
  return {
    ...prevState,
    layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
  };
};

export const getAnnotationsConfiguration = ({
  state,
  frame,
  layer,
}: {
  state: XYState;
  frame: FramePublicAPI;
  layer: XYAnnotationLayerConfig;
}) => {
  const dataLayers = getDataLayers(state.layers);

  return {
    noDatasource: true,
    groups: [
      {
        groupId: 'xAnnotations',
        groupLabel: getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) }),
        accessors: layer.config.map(({ id, color }) => ({
          columnId: id,
          color,
          triggerIcon: 'color' as const,
        })),
        dataTestSubj: 'lnsXY_xAnnotationsPanel',
        invalid: !dataLayers.some(({ xAccessor }) => xAccessor != null),
        invalidMessage: i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp', {
          defaultMessage: 'Annotations require a time based chart to work. Add a date histogram.',
        }),
        required: false,
        requiresPreviousColumnOnDuplicate: true,
        supportsMoreColumns: true,
        supportFieldFormat: false,
        enableDimensionEditor: true,
        filterOperations: () => false,
      },
    ],
  };
};
