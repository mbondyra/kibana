/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/server';

export function setupSavedObjects(core: CoreSetup) {
  // todo: handle migration, in app link
  core.savedObjects.registerType({
    name: 'event_annotation_group',
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      icon: 'questionInCircle',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
    },
    mappings: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
  });

  core.savedObjects.registerType({
    name: 'event_annotation',
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      icon: 'annotation',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
    },
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
