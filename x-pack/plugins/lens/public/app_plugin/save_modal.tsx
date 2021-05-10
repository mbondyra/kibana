/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { Document } from '../persistence';
import type { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';

import {
  TagEnhancedSavedObjectSaveModalOrigin,
  OriginSaveProps,
} from './tags_saved_object_save_modal_origin_wrapper';
import {
  TagEnhancedSavedObjectSaveModalDashboard,
  DashboardSaveProps,
} from './tags_saved_object_save_modal_dashboard_wrapper';

export type SaveProps = OriginSaveProps | DashboardSaveProps;

export interface Props {
  isVisible: boolean;
  savingToLibraryPermitted?: boolean;

  originatingApp?: string;
  allowByValueEmbeddables: boolean;

  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  tagsIds: string[];

  lastKnownDoc?: Document;

  getAppNameFromId: () => string | undefined;
  returnToOriginSwitchLabel?: string;

  onClose: () => void;
  onSave: (props: SaveProps, options: { saveToLibrary: boolean }) => void;
}

export const SaveModal = (props: Props) => {
  if (!props.isVisible || !props.lastKnownDoc) {
    return null;
  }

  const {
    originatingApp,
    savingToLibraryPermitted,
    savedObjectsTagging,
    tagsIds,
    lastKnownDoc,
    allowByValueEmbeddables,
    returnToOriginSwitchLabel,
    getAppNameFromId,
    onClose,
    onSave,
  } = props;

  const sharedProps = {
    savedObjectsTagging,
    initialTags: tagsIds,
    onClose,
    objectType: i18n.translate('xpack.lens.app.saveModalType', {
      defaultMessage: 'Lens visualization',
    }),
  };

  // Use the modal with return-to-origin features if we're in an app's edit flow or if by-value embeddables are disabled
  if (originatingApp || !allowByValueEmbeddables) {
    return (
      <TagEnhancedSavedObjectSaveModalOrigin
        {...sharedProps}
        originatingApp={originatingApp}
        onSave={(saveProps) => onSave(saveProps, { saveToLibrary: true })}
        getAppNameFromId={getAppNameFromId}
        documentInfo={{
          id: lastKnownDoc.savedObjectId,
          title: lastKnownDoc.title || '',
          description: lastKnownDoc.description || '',
        }}
        returnToOriginSwitchLabel={returnToOriginSwitchLabel}
        data-test-subj="lnsApp_saveModalOrigin"
      />
    );
  }

  return (
    <TagEnhancedSavedObjectSaveModalDashboard
      {...sharedProps}
      canSaveByReference={Boolean(savingToLibraryPermitted)}
      onSave={(saveProps) => {
        const saveToLibrary = Boolean(saveProps.addToLibrary);
        onSave(saveProps, { saveToLibrary });
      }}
      documentInfo={{
        // if the user cannot save to the library - treat this as a new document.
        id: savingToLibraryPermitted ? lastKnownDoc.savedObjectId : undefined,
        title: lastKnownDoc.title || '',
        description: lastKnownDoc.description || '',
      }}
      data-test-subj="lnsApp_saveModalDashboard"
    />
  );
};
