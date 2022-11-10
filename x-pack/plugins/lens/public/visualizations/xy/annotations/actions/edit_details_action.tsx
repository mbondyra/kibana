/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { LayerAction, StateSetter } from '../../../../types';
import { FlyoutContainer } from '../../../../shared_components/flyout_container';
import type { XYState, XYAnnotationLayerConfig } from '../../types';

const EditDetailsFlyout = () => {
  return (
    <FlyoutContainer
      isOpen={true}
      groupLabel={i18n.translate('xpack.lens.editorFrame.layerSettingsTitle', {
        defaultMessage: 'Layer settings',
      })}
      handleClose={() => {
        console.log('TODO: close flyout');
        return true;
      }}
    >
      <div>WHAT</div>
    </FlyoutContainer>
  );
};

export const getEditDetailsAction = ({
  state,
  layer,
  layerIndex,
  setState,
  core,
  isNew,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
  core: CoreStart;
  isNew?: boolean;
}): LayerAction => {
  return {
    displayName: i18n.translate('xpack.lens.xyChart.annotations.editAnnotationGroupDetails', {
      defaultMessage: 'Edit annotation group details',
    }),
    description: i18n.translate(
      'xpack.lens.xyChart.annotations.editAnnotationGroupDetailsDescription',
      { defaultMessage: 'Edit title, description and tags of the annotation group' }
    ),
    execute: async () => {
      // TODO: open flyout
      console.log('TODO: edit details action!, title, description, tags');
      // const modal = core.overlays.openModal(
      //   toMountPoint(<div/>,{ theme$: props.core.theme.theme$ }),
      //   {
      //     'data-test-subj': 'lnsLayerUnlinkModal',
      //   }
      // );

      const modal = core.overlays.openFlyout(
        toMountPoint(<EditDetailsFlyout />, { theme$: core.theme.theme$ }),
        {
          'data-test-subj': 'lnsLayerEditDetailsFlyout',
          closeButtonAriaLabel: 'jobSelectorFlyout',
          onClose: () => {
            console.log('close');
          },
          size: 's',
          maskProps: { style: 'background: transparent' },
        }
      );
      await modal.onClose;
    },
    icon: 'pencil',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_editAnnotationDetails',
  };
};
