/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { CoreRequestHandlerContext, RequestHandlerContext } from '@kbn/core/server';
import type { AwaitedProperties } from '@kbn/utility-types';

const createRequestHandlerContextFromCoreContext = (
  coreContext: CoreRequestHandlerContext
): RequestHandlerContext => {
  const requestHandlerContext: RequestHandlerContext = {
    core: Promise.resolve(coreContext),
    resolve: async <T extends keyof Omit<RequestHandlerContext, 'resolve'>>(parts: T[]) => {
      const resolved = {} as AwaitedProperties<Pick<RequestHandlerContext, T>>;

      for (const part of parts) {
        resolved[part] = (await requestHandlerContext[part]) as Awaited<RequestHandlerContext[T]>;
      }

      return resolved;
    },
  };

  return requestHandlerContext;
};

export const createRequestHandlerContextForRequest = ({
  request,
  elasticsearch,
  featureFlags,
  savedObjects,
  security,
  uiSettings,
}: {
  request: KibanaRequest;
  elasticsearch: ElasticsearchServiceStart;
  featureFlags: FeatureFlagsStart;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
  uiSettings: UiSettingsServiceStart;
}): RequestHandlerContext => {
  const savedObjectsClient = savedObjects.getScopedClient(request);
  const elasticsearchClient = elasticsearch.client.asScoped(request);

  return createRequestHandlerContextFromCoreContext({
    savedObjects: {
      client: savedObjectsClient,
      typeRegistry: savedObjects.getTypeRegistry(),
      getClient: () => savedObjectsClient,
      getExporter: savedObjects.createExporter,
      getImporter: savedObjects.createImporter,
    },
    elasticsearch: {
      client: elasticsearchClient,
    },
    featureFlags: {
      getBooleanValue: featureFlags.getBooleanValue.bind(featureFlags),
      getStringValue: featureFlags.getStringValue.bind(featureFlags),
      getNumberValue: featureFlags.getNumberValue.bind(featureFlags),
    },
    uiSettings: {
      client: uiSettings.asScopedToClient(savedObjectsClient),
      globalClient: uiSettings.globalAsScopedToClient(savedObjectsClient),
    },
    deprecations: {
      client: {
        getAllDeprecations: async () => [],
      },
    },
    security: {
      authc: {
        getCurrentUser: () => security.authc.getCurrentUser(request),
        apiKeys: {
          areAPIKeysEnabled: security.authc.apiKeys.areAPIKeysEnabled,
          create: (params) => security.authc.apiKeys.create(request, params),
          update: (params) => security.authc.apiKeys.update(request, params),
          validate: security.authc.apiKeys.validate,
          invalidate: (params) => security.authc.apiKeys.invalidate(request, params),
          uiam: security.authc.apiKeys.uiam
            ? {
                grant: (params) => security.authc.apiKeys.uiam!.grant(request, params),
                invalidate: (params) => security.authc.apiKeys.uiam!.invalidate(request, params),
                convert: security.authc.apiKeys.uiam.convert.bind(security.authc.apiKeys.uiam),
              }
            : null,
        },
      },
      audit: {
        logger: security.audit.asScoped(request),
      },
    },
    userProfile: {
      getCurrent: async () => null,
    },
  });
};
