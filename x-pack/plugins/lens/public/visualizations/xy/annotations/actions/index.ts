/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LayerAction, StateSetter } from '../../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../../types';

export const createAnnotationActions = ({
  state,
  layer,
  layerIndex,
  setState,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
}): LayerAction[] => {
  const ignoreGlobalFilters = !layer.ignoreGlobalFilters
    ? i18n.translate('xpack.lens.xyChart.annotations.ignoreGlobalFiltersLabel', {
      defaultMessage: 'Ignore global filters',
    })
    : i18n.translate('xpack.lens.xyChart.annotations.keepGlobalFiltersLabel', {
      defaultMessage: 'Keep global filters',
    });

  const actions = [{
    displayName: ignoreGlobalFilters,
    description: !layer.ignoreGlobalFilters
      ? i18n.translate('xpack.lens.xyChart.annotations.ignoreGlobalFiltersDescription', {
        defaultMessage:
          'All the dimensions configured in this layer ignore filters defined at kibana level.',
      })
      : i18n.translate('xpack.lens.xyChart.annotations.keepGlobalFiltersDescription', {
        defaultMessage:
          'All the dimensions configured in this layer respect filters defined at kibana level.',
      }),
    execute: () => {
      const newLayers = [...state.layers];
      newLayers[layerIndex] = { ...layer, ignoreGlobalFilters: !layer.ignoreGlobalFilters };
      return setState({ ...state, layers: newLayers });
    },
    icon: !layer.ignoreGlobalFilters ? 'eyeClosed' : 'eye',
    isCompatible: true,
    'data-test-subj': !layer.ignoreGlobalFilters
      ? 'lnsXY_annotationLayer_ignoreFilters'
      : 'lnsXY_annotationLayer_keepFilters',
  }]

  // todo
  const savingToLibraryPermitted = true;
  // const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);

  // check if the annotation is saved as a saved object or in inline - how do we check it for save modal for visualization?

  const isAnnotationGroupSO = false

  if (savingToLibraryPermitted) {
    const libraryAction = isAnnotationGroupSO ?
      {
        displayName: i18n.translate('xpack.lens.xyChart.annotations.unlinkFromLibrary', {
          defaultMessage: 'Unlink from library',
        }),
        description: i18n.translate('xpack.lens.xyChart.annotations.unlinksFromLibrary', {
          defaultMessage: 'Saves the annotation group as a part of the Lens Saved Object',
        }),
        execute: () => {
          return state;
        },
        icon: 'unlink',
        isCompatible: true,
        'data-test-subj': 'lnsXY_annotationLayer_unlinkFromLibrary',
      }
      : {
        displayName: i18n.translate('xpack.lens.xyChart.annotations.addToLibrary', {
          defaultMessage: 'Add to library',
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
      }
    actions.push(libraryAction)
  }

  return actions
};
