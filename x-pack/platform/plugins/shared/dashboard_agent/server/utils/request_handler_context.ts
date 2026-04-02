/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, CoreStart, RequestHandlerContext } from '@kbn/core/server';
import type { AwaitedProperties } from '@kbn/utility-types';

export const createRequestHandlerContextFromCoreContext = (
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

export const createInternalRequestHandlerContext = (
  coreStart: CoreStart
): RequestHandlerContext => {
  const savedObjectsClient = coreStart.savedObjects.getUnsafeInternalClient();
  const elasticsearchClient = coreStart.elasticsearch.client.asInternalUser;

  return createRequestHandlerContextFromCoreContext({
    savedObjects: {
      client: savedObjectsClient,
      typeRegistry: coreStart.savedObjects.getTypeRegistry(),
      getClient: () => savedObjectsClient,
      getExporter: coreStart.savedObjects.createExporter,
      getImporter: coreStart.savedObjects.createImporter,
    },
    elasticsearch: {
      client: {
        asCurrentUser: elasticsearchClient,
        asInternalUser: elasticsearchClient,
        asSecondaryAuthUser: elasticsearchClient,
      },
    },
    featureFlags: {
      getBooleanValue: coreStart.featureFlags.getBooleanValue.bind(coreStart.featureFlags),
      getStringValue: coreStart.featureFlags.getStringValue.bind(coreStart.featureFlags),
      getNumberValue: coreStart.featureFlags.getNumberValue.bind(coreStart.featureFlags),
    },
    uiSettings: {
      client: coreStart.uiSettings.asScopedToClient(savedObjectsClient),
      globalClient: coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient),
    },
    deprecations: {
      client: {
        getAllDeprecations: async () => [],
      },
    },
    security: {
      authc: {
        getCurrentUser: () => null,
        apiKeys: {
          areAPIKeysEnabled: coreStart.security.authc.apiKeys.areAPIKeysEnabled,
          create: async () => {
            throw new Error('API key creation requires a Kibana request context');
          },
          update: async () => {
            throw new Error('API key updates require a Kibana request context');
          },
          validate: coreStart.security.authc.apiKeys.validate,
          invalidate: async () => {
            throw new Error('API key invalidation requires a Kibana request context');
          },
          uiam: null,
        },
      },
      audit: {
        logger: coreStart.security.audit.withoutRequest,
      },
    },
    userProfile: {
      getCurrent: async () => null,
    },
  });
};
