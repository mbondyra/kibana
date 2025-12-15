/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOContentStorage } from '@kbn/content-management-utils';
import type {
  SOWithMetadata,
  SOWithMetadataPartial,
  PartialSavedObject,
} from '@kbn/content-management-utils';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import { cmServicesDefinition } from './cm_services';
import type {
  VisualizationContentType,
  VisualizationCrudTypes,
} from '../../common/content_management';

const SO_TYPE: VisualizationContentType = 'visualization';

export class VisualizationsStorage extends SOContentStorage<VisualizationCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: SO_TYPE,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'version',
        'visState',
        'kibanaSavedObjectMeta',
        'uiStateJSON',
        'savedSearchRefName',
        'project_routing',
      ],
      logger,
      throwOnResultValidationError,
    });
  }

  override savedObjectToItem(
    savedObject: SavedObject<VisualizationCrudTypes['Attributes']>
  ): VisualizationCrudTypes['Item'];
  override savedObjectToItem(
    savedObject: PartialSavedObject<VisualizationCrudTypes['Attributes']>,
    partial: true
  ): VisualizationCrudTypes['PartialItem'];
  override savedObjectToItem(
    savedObject:
      | SavedObject<VisualizationCrudTypes['Attributes']>
      | PartialSavedObject<VisualizationCrudTypes['Attributes']>,
    partial?: boolean
  ): SOWithMetadata | SOWithMetadataPartial {
    const so = super.savedObjectToItem(savedObject, partial as true);

    // Filter out project_routing if it's null - null means the value was explicitly cleared
    // and shouldn't be returned in the response
    if (so.attributes.project_routing === null) {
      const { project_routing, ...attributesWithoutProjectRouting } = so.attributes;
      return {
        ...so,
        attributes: attributesWithoutProjectRouting,
      };
    }

    return so;
  }
}
