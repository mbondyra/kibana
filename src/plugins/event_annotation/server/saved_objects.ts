/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreSetup,
  mergeSavedObjectMigrationMaps,
  SavedObject,
  SavedObjectMigrationMap,
} from '@kbn/core/server';

import type {
  SavedObjectsClientContract,
  SavedObjectsExportTransformContext,
} from '@kbn/core/server';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { EventAnnotationConfig } from '../common';
import { EVENT_ANNOTATION_GROUP_TYPE, EVENT_ANNOTATION_TYPE } from '../common/constants';
import { EventAnnotationGroupAttributes } from '../common/types';

type EventAnnotationAttributes = EventAnnotationConfig;

export const EVENT_ANNOTATIONS_INDEX = '.kibana_event_annotations';

export function setupSavedObjects(coreSetup: CoreSetup) {
  coreSetup.savedObjects.registerType({
    name: EVENT_ANNOTATION_GROUP_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    indexPattern: EVENT_ANNOTATIONS_INDEX,
    management: {
      icon: 'questionInCircle',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: EventAnnotationGroupAttributes }) => obj.attributes.title,
      onExport: async (context, objects: Array<SavedObject<EventAnnotationGroupAttributes>>) =>
        handleExport({ context, objects, coreSetup }),
      // getInAppUrl // TODO: when we want to add the annotation separate editor
    },
    migrations: () => {
      // TODO: adhoc data views?
      const dataViewMigrations = DataViewPersistableStateService.getAllMigrations();
      return mergeSavedObjectMigrationMaps(eventAnnotationGroupMigrations, dataViewMigrations);
    },
    mappings: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        tags: {
          type: 'keyword',
        },
      },
    },
  });

  coreSetup.savedObjects.registerType({
    name: EVENT_ANNOTATION_TYPE,
    indexPattern: EVENT_ANNOTATIONS_INDEX,
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      visibleInManagement: true, // TODO: change to false when figuring out deleting event annotation groups
      importableAndExportable: true,
    },
    migrations: () => eventAnnotationMigrations,
    mappings: {
      properties: {
        type: {
          type: 'text',
        },
        key: {
          type: 'flattened',
        },
        color: {
          type: 'text',
        },
        line_style: {
          type: 'text',
        },
        icon: {
          type: 'text',
        },
        label: {
          type: 'text',
        },
        width: {
          type: 'long',
        },
        extra_fields: {
          type: 'flattened', // should be array?
        },
        query: {
          type: 'flattened',
        },
      },
    },
  });
}

export async function handleExport({
  context,
  objects,
  coreSetup,
}: {
  context: SavedObjectsExportTransformContext;
  objects: Array<SavedObject<EventAnnotationGroupAttributes>>;
  coreSetup: CoreSetup;
}): Promise<Array<SavedObject<EventAnnotationGroupAttributes | EventAnnotationAttributes>>> {
  try {
    if (objects.length <= 0) {
      return [];
    }
    const [{ savedObjects }] = await coreSetup.getStartServices();
    const savedObjectsClient = savedObjects.getScopedClient(context.request);

    const annotationsSavedObjects = await getAnnotationsSavedObjects({
      savedObjectsClient,
      groupIds: objects.map((o) => o.id),
    });

    return [...objects, ...annotationsSavedObjects.flat()];
  } catch (error) {
    throw new Error('Error exporting annotations');
  }
}

async function getAnnotationsSavedObjects({
  savedObjectsClient,
  groupIds,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  groupIds: string[];
}): Promise<Array<SavedObject<EventAnnotationAttributes>>> {
  const references = groupIds.map((id) => ({ type: EVENT_ANNOTATION_GROUP_TYPE, id }));

  const finder = savedObjectsClient.createPointInTimeFinder<EventAnnotationAttributes>({
    type: EVENT_ANNOTATION_TYPE,
    hasReference: references,
  });

  let result: Array<SavedObject<EventAnnotationAttributes>> = [];
  for await (const findResults of finder.find()) {
    result = result.concat(findResults.saved_objects);
  }

  return result;
}

const eventAnnotationGroupMigrations: SavedObjectMigrationMap = {};

const eventAnnotationMigrations: SavedObjectMigrationMap = {};
