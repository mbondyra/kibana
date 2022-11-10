/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiCheckboxProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { LayerAction } from '../../../../types';
import { LOCAL_STORAGE_LENS_KEY } from '../../../../settings_storage';

const SKIP_UNLINK_FROM_LIBRARY_KEY = 'skipSaveFromLibraryModal';

const getButtonCopy = (title: string) => {
  const modalTitle = i18n.translate('xpack.lens.modalTitle.saveAnnotationGroupTitle', {
    defaultMessage: 'Save "{title}" to library?',
    values: { title },
  });
  const modalDesc = i18n.translate('xpack.lens.layer.saveModal.saveAnnotationGroupDescription', {
    defaultMessage: `Saving to the library will cause this annotation group to be saved locally to this visualization. Any changes made will no longer be shared with the originating annotation library group.`,
  });

  return {
    modalTitle,
    modalDesc,
  };
};

const SaveConfirmModal = ({
  modalTitle,
  modalDesc,
  skipSaveFromLibraryModal,
  execute,
  closeModal,
  updateLensLocalStorage,
}: {
  modalTitle: string;
  modalDesc: string;
  skipSaveFromLibraryModal: boolean;
  execute: () => void;
  closeModal: () => void;
  updateLensLocalStorage: (partial: Record<string, unknown>) => void;
}) => {
  const [skipDeleteModalLocal, setSkipDeleteModalLocal] = useState(skipSaveFromLibraryModal);
  const onChangeShouldShowModal: EuiCheckboxProps['onChange'] = useCallback(
    ({ target }) => setSkipDeleteModalLocal(target.checked),
    []
  );

  const onSave = useCallback(() => {
    updateLensLocalStorage({
      [SKIP_UNLINK_FROM_LIBRARY_KEY]: skipDeleteModalLocal,
    });
    closeModal();
    execute();
  }, [closeModal, execute, skipDeleteModalLocal, updateLensLocalStorage]);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <p>
          {modalDesc}
          {i18n.translate('xpack.lens.layer.saveModal.cannotUndo', {
            defaultMessage: `You can't undo this action.`,
          })}
        </p>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiCheckbox
              id={'lnsLayerRemoveModalCheckbox'}
              label={i18n.translate('xpack.lens.layer.saveModal.dontAskAgain', {
                defaultMessage: `Don't ask me again`,
              })}
              checked={skipDeleteModalLocal}
              onChange={onChangeShouldShowModal}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeModal}>
                  {i18n.translate('xpack.lens.layer.cancelDelete', {
                    defaultMessage: `Cancel`,
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="lnsLayerSaveConfirmButton"
                  onClick={onSave}
                  color="warning"
                  iconType="save"
                  fill
                >
                  {i18n.translate('xpack.lens.layer.saveConfirm', {
                    defaultMessage: `Save`,
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};

export const getSaveLayerAction = (props: {
  execute: () => void;
  core: Pick<CoreStart, 'overlays' | 'theme'>;
  isNew?: boolean;
}): LayerAction => {
  const { modalTitle, modalDesc } = getButtonCopy('title');

  let displayName = i18n.translate('xpack.lens.xyChart.annotations.save', {
    defaultMessage: 'Save',
  });
  if (props.isNew) {
    displayName = i18n.translate('xpack.lens.xyChart.annotations.addToLibrary', {
      defaultMessage: 'Add to library',
    });
  }

  return {
    execute: async () => {
      const storage = new Storage(localStorage);
      const lensLocalStorage = storage.get(LOCAL_STORAGE_LENS_KEY) ?? {};

      const updateLensLocalStorage = (partial: Record<string, unknown>) => {
        storage.set(LOCAL_STORAGE_LENS_KEY, {
          ...lensLocalStorage,
          ...partial,
        });
      };

      if (!lensLocalStorage.skipSaveFromLibraryModal) {
        const modal = props.core.overlays.openModal(
          toMountPoint(
            <SaveConfirmModal
              modalTitle={modalTitle}
              modalDesc={modalDesc}
              skipSaveFromLibraryModal={lensLocalStorage[LOCAL_STORAGE_LENS_KEY] ?? false}
              execute={props.execute}
              closeModal={() => modal.close()}
              updateLensLocalStorage={updateLensLocalStorage}
            />,
            { theme$: props.core.theme.theme$ }
          ),
          {
            'data-test-subj': 'lnsLayerSaveModal',
          }
        );
        await modal.onClose;
      } else {
        props.execute();
      }
    },
    displayName,
    description: i18n.translate('xpack.lens.xyChart.annotations.saveToLibraryDescription', {
      defaultMessage: 'Saves the annotation group as a separate object',
    }),
    icon: 'save',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_saveToLibrary',
  };
};
