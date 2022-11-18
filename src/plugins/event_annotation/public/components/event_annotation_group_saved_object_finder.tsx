/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiFieldSearchProps, EuiFormRowProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedObjectFinderUi } from '@kbn/saved-objects-plugin/public';
import { SavedObjectsStart, SimpleSavedObject } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { EVENT_ANNOTATION_GROUP_TYPE } from '../../common';

export const EventAnnotationGroupSavedObjectFinder = ({
  uiSettings,
  savedObjects,
  fixedPageSize = 10,
  onChoose,
  onClick = () => {},
}: {
  uiSettings: IUiSettingsClient;
  savedObjects: SavedObjectsStart;
  fixedPageSize: number;
  onChoose: (value: {
    id: string;
    type: string;
    fullName: string;
    savedObject: SimpleSavedObject<unknown>;
  }) => void;
  onClick?: () => void;
}) => {
  const euiFormRowProps = useMemo(
    () =>
      ({
        label: i18n.translate(
          'eventAnnotation.eventAnnotationGroup.savedObjectFinder.searchInputLabel',
          {
            defaultMessage: 'Select annotation group',
          }
        ),
        labelAppend: (
          <EuiButtonEmpty onClick={onClick} color="primary" size="xs">
            <FormattedMessage
              id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.createVisualizationButtonLabel"
              defaultMessage="Create visualization"
            />
          </EuiButtonEmpty>
        ),
        helpText: i18n.translate(
          'eventAnnotation.eventAnnotationGroup.savedObjectFinder.searchInputHelpText',
          {
            defaultMessage: 'Insert annotations from existing annotation groups.',
          }
        ),
      } as EuiFormRowProps),
    [onClick]
  );
  return (
    <SavedObjectFinderUi
      key={'searchSavedObjectFinder'}
      fixedPageSize={fixedPageSize}
      onChoose={(id, type, fullName, savedObject) => {
        onChoose({ id, type, fullName, savedObject });
      }}
      showFilter={false}
      noItemsMessage={
        <FormattedMessage
          id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.notFoundLabel"
          defaultMessage="No matching annotation groups found."
        />
      }
      savedObjectMetaData={savedObjectMetaData}
      uiSettings={uiSettings}
      savedObjects={savedObjects}
      euiFieldSearchProps={euiFieldSearchProps}
      euiFormRowProps={euiFormRowProps}
    />
  );
};

const savedObjectMetaData = [
  {
    type: EVENT_ANNOTATION_GROUP_TYPE,
    getIconForSavedObject: () => 'annotation',
    name: i18n.translate('xpack.lens.savedObjectType.eventAnnotationGroups', {
      defaultMessage: 'Annotations Groups',
    }),
    includeFields: ['*'],
  },
];

const euiFieldSearchProps = {
  prepend: i18n.translate(
    'eventAnnotation.eventAnnotationGroup.savedObjectFinder.searchInputPrependLabel',
    {
      defaultMessage: 'Template',
    }
  ),
} as EuiFieldSearchProps;
