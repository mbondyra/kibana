/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { LayerAction, StateSetter } from '../../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../../types';
import { getUnlinkLayerAction } from './unlink_action';
import { getIgnoreFilterAction } from './ignore_filters_action';
import { getEditDetailsAction } from './edit_details_action';
// import { getRevertAction } from './revert_changes_action';
import { getSaveLayerAction } from './save_action';

export const createAnnotationActions = ({
  state,
  layer,
  layerIndex,
  setState,
  core,
  isSaveable,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
  core: CoreStart;
  isSaveable: boolean;
}): LayerAction[] => {
  const actions = [];

  const savingToLibraryPermitted = Boolean(
    core.application.capabilities.visualize.save && isSaveable
  );

  if (savingToLibraryPermitted) {
    // check if the annotation is saved as a saved object or in inline - how do we check it for save modal for visualization?
    const isAnnotationGroupSO = true;

    if (isAnnotationGroupSO) {
      // TODO: check if hasUnsavedChanges to know if can revert & can save
      // compare saved object to current state!
      const hasUnsavedChanges = true;

      if (hasUnsavedChanges) {
        const saveAction = getSaveLayerAction({
          state,
          layer,
          layerIndex,
          setState,
          core,
          execute: () => {
            // SAVE TO LIBRARY
          },
        });
        actions.push(saveAction);
      }

      const editDetailsAction = getEditDetailsAction({ state, layer, layerIndex, setState, core });

      const unlinkAction = getUnlinkLayerAction({
        execute: () => {
          // SAVE TO LIBRARY
          // const title = 'Annotation group name'; // TODO: pass title
          core.notifications.toasts.addSuccess(
            i18n.translate('xpack.lens.xyChart.annotations.notificationUnlinked', {
              defaultMessage: `Unlinked “{title}“ from library`,
              values: { title },
            })
          );
        },
        core,
      });
      actions.push(editDetailsAction, unlinkAction);

      // TODO: revert can be implemented later
      // if (hasUnsavedChanges) {
      //   const revertAction = getRevertAction({ state, layer, layerIndex, setState });
      //   actions.push(revertAction);
      // }
    } else {
      actions.push(
        getSaveLayerAction({
          isNew: true,
          state,
          layer,
          layerIndex,
          setState,
          core,
          execute: () => {
            // console.log('Add to library');
          },
        })
      );
    }
  }

  const ignoreGlobalFiltersAction = getIgnoreFilterAction({ state, layer, layerIndex, setState });
  actions.push(ignoreGlobalFiltersAction);

  return actions;
};
