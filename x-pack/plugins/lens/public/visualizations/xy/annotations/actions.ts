/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LayerActionFromVisualization, StateSetter } from '../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../types';

export const IGNORE_GLOBAL_FILTERS_ACTION_ID = 'ignoreGlobalFilters';
export const KEEP_GLOBAL_FILTERS_ACTION_ID = 'keepGlobalFilters';

export const createAnnotationActions = ({
  state,
  layer,
  layerIndex,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
}): LayerActionFromVisualization[] => {
  const label = !layer.ignoreGlobalFilters
    ? i18n.translate('xpack.lens.xyChart.annotations.ignoreGlobalFiltersLabel', {
        defaultMessage: 'Ignore global filters',
      })
    : i18n.translate('xpack.lens.xyChart.annotations.keepGlobalFiltersLabel', {
        defaultMessage: 'Keep global filters',
      });
  // todo
  const savingToLibraryPermitted = true;
  // const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);

  return [
    {
      id: !layer.ignoreGlobalFilters
        ? IGNORE_GLOBAL_FILTERS_ACTION_ID
        : KEEP_GLOBAL_FILTERS_ACTION_ID,
      displayName: label,
      description: !layer.ignoreGlobalFilters
        ? i18n.translate('xpack.lens.xyChart.annotations.ignoreGlobalFiltersDescription', {
            defaultMessage:
              'All the dimensions configured in this layer ignore filters defined at kibana level.',
          })
        : i18n.translate('xpack.lens.xyChart.annotations.keepGlobalFiltersDescription', {
            defaultMessage:
              'All the dimensions configured in this layer respect filters defined at kibana level.',
          }),
      icon: !layer.ignoreGlobalFilters ? 'eyeClosed' : 'eye',
      isCompatible: true,
      'data-test-subj': !layer.ignoreGlobalFilters
        ? 'lnsXY_annotationLayer_ignoreFilters'
        : 'lnsXY_annotationLayer_keepFilters',
    },
    {
      displayName: i18n.translate('xpack.lens.xyChart.annotations.saveToLibrary', {
        defaultMessage: 'Save to library',
      }),
      description: i18n.translate('xpack.lens.xyChart.annotations.saveToLibraryDescription', {
        defaultMessage: 'Saves the annotation group as a separate object',
      }),
      execute: () => {
        const newLayers = [...state.layers];
        newLayers[layerIndex] = { ...layer, ignoreGlobalFilters: !layer.ignoreGlobalFilters };
        return setState({ ...state, layers: newLayers });
      },
      icon: 'save',
      isCompatible: true,
      'data-test-subj': 'lnsXY_annotationLayer_saveToLibrary',
    },
  ];
};
