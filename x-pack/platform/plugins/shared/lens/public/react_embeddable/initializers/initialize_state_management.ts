/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StateComparators } from '@kbn/presentation-publishing';
import {
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataViews,
  type PublishesSavedObjectId,
  type PublishesRendered,
} from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { BehaviorSubject, map, merge } from 'rxjs';
import type {
  IntegrationCallbacks,
  LensInternalApi,
  LensRuntimeState,
  LensSerializedState,
} from '@kbn/lens-common';
import type { PublishesLayerProjectRoutingOverrides } from '@kbn/lens-common-2';

export interface StateManagementConfig {
  api: Pick<IntegrationCallbacks, 'updateAttributes' | 'updateSavedObjectId'> &
    PublishesSavedObjectId &
    PublishesDataViews &
    PublishesDataLoading &
    PublishesRendered &
    PublishesBlockingError &
    PublishesLayerProjectRoutingOverrides;
  anyStateChange$: Observable<void>;
  getComparators: () => StateComparators<Pick<LensSerializedState, 'attributes' | 'savedObjectId'>>;
  reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => void;
  getLatestState: () => Pick<LensRuntimeState, 'attributes' | 'savedObjectId'>;
  cleanup: () => void;
}

/**
 * Helper function to check if there are layer-level project routing overrides
 */
function hasLayerProjectRoutingOverrides(attributes: LensRuntimeState['attributes']): boolean {
  if (!attributes?.state) {
    return false;
  }

  // Check form-based datasource layers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formBasedState = attributes.state.datasourceStates?.formBased as any;
  if (formBasedState?.layers) {
    const layers = Object.values(formBasedState.layers);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (layers.some((layer: any) => layer.projectRouting !== undefined)) {
      return true;
    }
  }

  // Check XY annotation layers
  if (attributes.visualizationType === 'lnsXY' && attributes.state.visualization) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xyState = attributes.state.visualization as any;
    if (xyState?.layers) {
      const annotationLayers = xyState.layers.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (layer: any) => layer.layerType === 'annotations'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (annotationLayers.some((layer: any) => layer.projectRouting !== undefined)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Due to inline editing we need something advanced to handle the state
 * management at the embeddable level, so here's the initializers for it
 */
export function initializeStateManagement(
  initialState: LensRuntimeState,
  internalApi: LensInternalApi
): StateManagementConfig {
  const savedObjectId$ = new BehaviorSubject<LensRuntimeState['savedObjectId']>(
    initialState.savedObjectId
  );

  // Create observable that tracks whether there are layer-level project routing overrides
  const hasLayerProjectRoutingOverrides$ = new BehaviorSubject<boolean>(
    hasLayerProjectRoutingOverrides(initialState.attributes)
  );

  // Subscribe to attributes changes to update hasLayerProjectRoutingOverrides$
  const subscription = internalApi.attributes$.subscribe((attributes) => {
    hasLayerProjectRoutingOverrides$.next(hasLayerProjectRoutingOverrides(attributes));
  });

  return {
    api: {
      updateAttributes: internalApi.updateAttributes,
      updateSavedObjectId: (newSavedObjectId: LensRuntimeState['savedObjectId']) =>
        savedObjectId$.next(newSavedObjectId),
      savedObjectId$,
      dataViews$: internalApi.dataViews$,
      dataLoading$: internalApi.dataLoading$,
      blockingError$: internalApi.blockingError$,
      rendered$: internalApi.hasRenderCompleted$,
      hasLayerProjectRoutingOverrides$,
    },
    anyStateChange$: merge(internalApi.attributes$).pipe(map(() => undefined)),
    getComparators: () => {
      return {
        attributes: initialState.savedObjectId === undefined ? 'deepEquality' : 'skip',
        savedObjectId: 'skip',
      };
    },
    getLatestState: () => {
      return {
        attributes: internalApi.attributes$.getValue(),
        savedObjectId: savedObjectId$.getValue(),
      };
    },
    reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => {
      internalApi.updateAttributes(lastSavedRuntimeState.attributes);
    },
    cleanup: () => {
      subscription.unsubscribe();
    },
  };
}
