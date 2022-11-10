/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './layer_panel.scss';

import React, { useMemo, useCallback, useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedObjectFinderUi } from '@kbn/saved-objects-plugin/public';
import { SavedObjectsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { FlyoutContainer } from '../../../shared_components/flyout_container';
import {
  useLensSelector,
  selectIsLoadLibraryVisible,
  setIsLoadLibraryVisible,
  useLensDispatch,
  addLayer as addLayerAction,
} from '../../../state_management';

import { Visualization } from '../../../types';
import { generateId } from '../../../id_generator';

// TODO: change to display the proper things
const savedObjectMetaData = [
  {
    type: 'lens',
    getIconForSavedObject: () => 'lensApp',
    name: i18n.translate('xpack.lens.savedObjectType.eventAnnotationGroups', {
      defaultMessage: 'Annotations Groups',
    }),
    includeFields: ['*'],
  },
];

const euiFieldSearchProps = {
  prepend: i18n.translate(
    'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputPrependLabel',
    {
      defaultMessage: 'Template',
    }
  ),
};

export function LoadAnnotationLibraryFlyout({
  layerId,
  activeVisualization,
  uiSettings,
  savedObjects,
}: {
  activeVisualization: Visualization;
  layerId: string;
  uiSettings: IUiSettingsClient;
  savedObjects: SavedObjectsStart;
}) {
  const dispatchLens = useLensDispatch();
  const setLibraryVisible = useCallback(
    (visible: boolean) => {
      dispatchLens(setIsLoadLibraryVisible(visible));
    },
    [dispatchLens]
  );

  const addLayer = () => {
    const layerId = generateId();
    dispatchLens(addLayerAction({ layerId, layerType: LayerTypes.ANNOTATIONS }));
  };

  const euiFormRowProps = useMemo(
    () => ({
      label: i18n.translate(
        'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputLabel',
        {
          defaultMessage: 'Select lens',
        }
      ),
      labelAppend: (
        <EuiButtonEmpty
          onClick={() => {
            console.log('click');
          }}
          color="primary"
          size="xs"
        >
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.createVisualizationButtonLabel"
            defaultMessage="Create visualization"
          />
        </EuiButtonEmpty>
      ),
      helpText: i18n.translate(
        'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputHelpText',
        {
          defaultMessage:
            'Insert lens from existing templates or creating a new one. You will only create lens for this comment and won’t change Visualize Library.',
        }
      ),
    }),
    []
  );

  const isLoadLibraryVisible = useLensSelector(selectIsLoadLibraryVisible);
  const containerPanelRef = useRef<HTMLDivElement | null>(null);
  const otherElementsHeight = 250;
  const singleEntryHeight = 40;
  const numberOfElements = Math.floor(
    ((containerPanelRef?.current?.clientHeight || 800) - otherElementsHeight) / singleEntryHeight
  );

  const [selectedItem, setSelectedItem] = React.useState<{ id: string } | null>(null);

  // needed to clean the state when clicking not on the item on the list
  const hasBeenClicked = useRef(false);

  React.useEffect(() => {
    hasBeenClicked.current = false;
  }, [selectedItem]);

  return (
    (activeVisualization && (
      <FlyoutContainer
        onClickInside={() => {
          if (!hasBeenClicked.current) {
            setSelectedItem(null);
          }
        }}
        panelContainerRef={(el) => (containerPanelRef.current = el)}
        customFooter={
          <EuiFlyoutFooter className="lnsDimensionContainer__footer">
            <EuiFlexGroup
              responsive={false}
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  size="s"
                  iconType="cross"
                  onClick={() => {
                    setLibraryVisible(false);
                    setSelectedItem(null);
                  }}
                  data-test-subj="lns-indexPattern-loadLibraryCancel"
                >
                  {i18n.translate('xpack.lens.loadAnnotationsLibrary.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => {
                    setLibraryVisible(false);
                    addLayer();
                  }}
                  iconType="folderOpen"
                  fill
                  disabled={!selectedItem}
                >
                  {i18n.translate('xpack.lens.loadAnnotationsLibrary.loadSelected', {
                    defaultMessage: 'Load selected',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        }
        isOpen={isLoadLibraryVisible}
        groupLabel={i18n.translate('xpack.lens.editorFrame.loadFromLibrary', {
          defaultMessage: 'Select annotations from library',
        })}
        handleClose={() => {
          setLibraryVisible(false);
          setSelectedItem(null);
          return true;
        }}
      >
        <div id={layerId}>
          <div className="lnsIndexPatternDimensionEditor--padded">
            <SavedObjectFinderUi
              key={'searchSavedObjectFinder'}
              fixedPageSize={numberOfElements}
              onChoose={(id, type, fullName, savedObject) => {
                hasBeenClicked.current = true;
                setSelectedItem({ id, type, fullName, savedObject });
              }}
              showFilter={false}
              noItemsMessage={
                <FormattedMessage
                  id="xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.notFoundLabel"
                  defaultMessage="No matching lens found."
                />
              }
              savedObjectMetaData={savedObjectMetaData}
              uiSettings={uiSettings}
              savedObjects={savedObjects}
              euiFieldSearchProps={euiFieldSearchProps}
              // @ts-expect-error update types
              euiFormRowProps={euiFormRowProps}
            />
          </div>
        </div>
      </FlyoutContainer>
    )) ||
    null
  );
}
