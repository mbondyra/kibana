/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import {
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
} from '@kbn/presentation-publishing';
import { VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS, VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import type { VegaEmbeddableState } from '../../server';
import { ensureVegaRenderable } from './ensure_vega_renderable';
import { VegaEmbeddableComponent } from './vega_embeddable_component';
import type { VegaEmbeddableApi } from './types';

export const getVegaEmbeddableFactory = () => {
  const vegaEmbeddableFactory: EmbeddablePublicDefinition<VegaEmbeddableState, VegaEmbeddableApi> =
    {
      type: VEGA_EMBEDDABLE_TYPE,
      buildEmbeddable: async ({
        initializeDrilldownsManager,
        initialState,
        finalizeApi,
        uuid,
        parentApi,
      }) => {
        await ensureVegaRenderable();

        const titleManager = initializeTitleManager(initialState);
        const timeRangeManager = initializeTimeRangeManager(initialState);
        const drilldownsManager = initializeDrilldownsManager(uuid, initialState);

        const spec$ = new BehaviorSubject<Record<string, unknown>>(
          'spec' in initialState ? initialState.spec : {}
        );
        const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

        const stateApi = initializeStateApi<VegaEmbeddableState>({
          uuid,
          parentApi,
          serializeState: () => ({
            ...titleManager.getLatestState(),
            ...timeRangeManager.getLatestState(),
            ...drilldownsManager.getLatestState(),
            spec: spec$.getValue(),
          }),
          anyStateChange$: merge(
            titleManager.anyStateChange$,
            timeRangeManager.anyStateChange$,
            drilldownsManager.anyStateChange$,
            spec$.pipe(
              skip(1),
              map((): void => undefined)
            )
          ),
          getComparators: () => ({
            ...titleComparators,
            ...timeRangeComparators,
            ...drilldownsManager.comparators,
            spec: 'deepEquality',
          }),
          applySerializedState: (nextState) => {
            titleManager.reinitializeState(nextState);
            timeRangeManager.reinitializeState(nextState);
            drilldownsManager.reinitializeState(nextState);
            if ('spec' in nextState) {
              spec$.next(nextState.spec);
            }
          },
        });

        const api = finalizeApi({
          ...titleManager.api,
          ...timeRangeManager.api,
          ...drilldownsManager.api,
          ...stateApi,
          dataLoading$,
          supportedTriggers: () => VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS,
        });

        return {
          api,
          Component: () => {
            useEffect(() => {
              return () => {
                drilldownsManager.cleanup();
              };
            }, []);

            return (
              <VegaEmbeddableComponent
                api={api}
                spec$={spec$}
                onLoading={(loading) => dataLoading$.next(loading)}
              />
            );
          },
        };
      },
    };

  return vegaEmbeddableFactory;
};
