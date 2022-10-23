/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectAttributes,
  SavedObjectsClientContract,
  ResolvedSimpleSavedObject,
  SavedObjectReference,
} from '@kbn/core/public';

export interface CustomGroupParams {}

// TODO: define it
export interface EventAnnotationGroupDocument {
  savedObjectId?: string;
  title?: string;
  description?: string;
  references: SavedObjectReference[];
}

export const EVENT_ANNOTATION_GROUP_TYPE = 'event_annotation_group';
export const EVENT_ANNOTATION_TYPE = 'event_annotation';

export interface EventAnnotationGroupSaver {
  save: (group: EventAnnotationGroupDocument) => Promise<{ savedObjectId: string }>;
}

export interface EventAnnotationGroupLoader {
  load: (savedObjectId: string) => Promise<ResolvedSimpleSavedObject>;
}

export type EventAnnotationGroupStore = EventAnnotationGroupLoader & EventAnnotationGroupSaver;

export class SavedObjectEventAnnotationGroupStore implements EventAnnotationGroupStore {
  private client: SavedObjectsClientContract;

  constructor(client: SavedObjectsClientContract) {
    this.client = client;
  }

  save = async (group: EventAnnotationGroupDocument) => {
    // const { type, ...rest } = group;
    // const attributes = rest as CustomGroupParams as SavedObjectAttributes;
    // const duplicate = group.title ? await this.checkForDuplicateTitle(group.title) : false;
    // let result;

    // if (duplicate) {
    //   result = await this.client.update(EVENT_ANNOTATION_GROUP_TYPE, duplicate, attributes);
    // } else {
    //   result = await this.client.create(EVENT_ANNOTATION_GROUP_TYPE, attributes, {
    //     overwrite: true,
    //   });
    // }
    // return { ...group, savedObjectId: result.id };
    const { savedObjectId, references, ...rest } = group;
    const attributes = rest;

    const result = await this.client.create(
      EVENT_ANNOTATION_GROUP_TYPE,
      attributes,
      savedObjectId
        ? {
            references,
            overwrite: true,
            id: savedObjectId,
          }
        : {
            references,
          }
    );

    return { ...group, savedObjectId: result.id };
  };

  getAll = async (groupType?: string) => {
    const resolveResult = await this.client.find({
      type: EVENT_ANNOTATION_GROUP_TYPE,
      search: groupType,
    });
    return resolveResult;
  };

  checkForDuplicateTitle = async (title: string) => {
    const result = await this.client.find({
      type: EVENT_ANNOTATION_GROUP_TYPE,
      searchFields: ['title'],
      search: `"${title}"`,
    });
    return result.savedObjects.length > 0 ? result.savedObjects[0].id : '';
  };

  load = async (savedObjectId: string): Promise<ResolvedSimpleSavedObject> => {
    const resolveResult = await this.client.resolve(EVENT_ANNOTATION_GROUP_TYPE, savedObjectId);

    if (resolveResult.saved_object.error) {
      throw resolveResult.saved_object.error;
    }

    return resolveResult;
  };
}
