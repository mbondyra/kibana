/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationGroupOutput } from '../../common/event_annotation_group';
import { CustomGroupParams, SavedObjectEventAnnotationGroupStore } from './event_annotation_store';

export const getEventAnnotationGroupFromStore = (
  eventAnnotationGroupStore: SavedObjectEventAnnotationGroupStore,
  eventAnnotationGroupType?: string
): Promise<Array<EventAnnotationGroupOutput<CustomGroupParams>>> => {
  return eventAnnotationGroupStore.getAll(eventAnnotationGroupType).then((response) => {
    return response.savedObjects.map((group) => {
      const attributes = group.attributes as EventAnnotationGroupOutput<CustomGroupParams>;
      return {
        name: attributes.name,
        params: attributes.params,
      };
    }) as Array<EventAnnotationGroupOutput<CustomGroupParams>>;
  });
};

export const saveEventAnnotationGroupToTheStore = (
  eventAnnotationGroupStore: SavedObjectEventAnnotationGroupStore,
  group: EventAnnotationGroupOutput<CustomGroupParams>,
  title: string,
  eventAnnotationGroupType?: string
) => {
  const groupToSave = {
    ...group,
    title,
    params: {
      ...group.params,
      title,
      eventAnnotationGroupType,
    },
  };
  return eventAnnotationGroupStore
    .save(groupToSave)
    .then((response) => {
      return {
        name: response.name,
        params: response.params,
      } as EventAnnotationGroupOutput<CustomGroupParams>;
    })
    .catch((error) => {
      throw new Error(`${error}`);
    });
};
