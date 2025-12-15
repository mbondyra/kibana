/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import type { EventEmitter } from 'events';
import type { Query } from '@kbn/es-query';
import type {
  VisualizeServices,
  VisualizeAppState,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
  IEditorController,
} from '../../types';
import { convertFromSerializedVis } from '../../../utils/saved_visualize_utils';

export const useEditorUpdates = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  setHasUnsavedChanges: (value: boolean) => void,
  appState: VisualizeAppStateContainer | null,
  visInstance: VisualizeEditorVisInstance | undefined,
  visEditorController: IEditorController | undefined
) => {
  const [isEmbeddableRendered, setIsEmbeddableRendered] = useState(false);
  const [currentAppState, setCurrentAppState] = useState<VisualizeAppState>();

  useEffect(() => {
    if (appState && visInstance) {
      const {
        timefilter: { timefilter },
        filterManager,
        queryString,
        state$,
      } = services.data.query;
      const { embeddableHandler, savedSearch, vis } = visInstance;
      const savedVis = 'savedVis' in visInstance ? visInstance.savedVis : undefined;
      const initialState = appState.getState();
      setCurrentAppState(initialState);

      const reloadVisualization = () => {
        if (visEditorController) {
          visEditorController.render({
            core: services,
            data: services.data,
            uiState: vis.uiState,
            timeRange: timefilter.getTime(),
            filters: filterManager.getFilters(),
            query: queryString.getQuery() as Query,
            linked: !!vis.data.savedSearchId,
            savedSearch,
            unifiedSearch: services.unifiedSearch,
          });
        } else {
          const projectRouting =
            vis.type.name === 'vega' && services.cps?.cpsManager
              ? services.cps.cpsManager.getProjectRouting()
              : undefined;
          embeddableHandler.updateInput({
            timeRange: timefilter.getTime(),
            filters: filterManager.getFilters(),
            query: queryString.getQuery() as Query,
            searchSessionId: services.data.search.session.getSessionId(),
            projectRouting,
          });
        }
      };

      const subscriptions = state$.subscribe({
        next: () => {
          services.data.search.session.start();
          // Update project routing on search source for Vega visualizations
          if (vis.type.name === 'vega' && vis.data.searchSource && services.cps?.cpsManager) {
            const projectRouting = services.cps.cpsManager.getProjectRouting();
            vis.data.searchSource.setField('projectRouting', projectRouting);
          }
          reloadVisualization();
        },
        error: services.fatalErrors.add,
      });

      const handleLinkedSearch = (linked: boolean) => {
        if (linked && savedVis && !savedVis.savedSearchId && savedSearch) {
          savedVis.savedSearchId = savedSearch.id;
          vis.data.savedSearchId = savedSearch.id;
          if (vis.data.searchSource) {
            vis.data.searchSource.setParent(savedSearch.searchSource);
          }
        } else if (!linked && savedVis && savedVis.savedSearchId) {
          delete savedVis.savedSearchId;
          delete vis.data.savedSearchId;
        } else if (!linked && !savedVis) {
          // delete link when it's not a saved vis
          delete vis.data.savedSearchId;
        }
      };

      // update persisted state from initial state
      if (initialState.uiState) {
        vis.uiState.setSilent(initialState.uiState);
      }

      // update the appState when the stateful instance changes
      const updateOnChange = () => {
        appState.transitions.set('uiState', vis.uiState.getChanges());
      };

      vis.uiState.on('change', updateOnChange);

      const sessionSubscription = services.data.search.session
        .getSession$()
        .subscribe((sessionId) => {
          if (embeddableHandler.getInput().searchSessionId !== sessionId) {
            embeddableHandler.updateInput({
              searchSessionId: sessionId,
            });
          }
        });

      // Subscribe to CPS project routing changes for Vega visualizations
      const cpsProjectRoutingSubscription =
        vis.type.name === 'vega' && services.cps?.cpsManager
          ? services.cps.cpsManager.getProjectRouting$().subscribe((projectRouting) => {
              // Update search source with new project routing
              if (vis.data.searchSource) {
                vis.data.searchSource.setField('projectRouting', projectRouting);
              }
              // Update embeddable input with new project routing and reload
              // The embeddable handler is always used for rendering, even when visEditorController exists
              embeddableHandler.updateInput({
                projectRouting,
              });
              // Force reload to fetch new data with updated project routing
              embeddableHandler.reload();
            })
          : undefined;

      const unsubscribeStateUpdates = appState.subscribe((state) => {
        setCurrentAppState(state);
        if (savedVis && savedVis.id && !services.history.location.pathname.includes(savedVis.id)) {
          // this filters out the case when manipulating the browser history back/forward
          // and initializing different visualizations
          return;
        }

        if (!isEqual(state.uiState, vis.uiState.getChanges())) {
          vis.uiState.set(state.uiState);
        }

        // if the browser history was changed manually we need to reflect changes in the editor
        if (
          savedVis &&
          !isEqual(
            {
              ...convertFromSerializedVis(vis.serialize()).visState,
              title: vis.title,
            },
            state.vis
          )
        ) {
          const { aggs, ...visState } = state.vis;
          vis.setState({
            ...visState,
            data: {
              aggs,
            },
          });
          embeddableHandler.reload();
          eventEmitter.emit('updateEditor');
        }

        handleLinkedSearch(state.linked);

        if (vis.data.searchSource) {
          vis.data.searchSource.setField('query', state.query);
          vis.data.searchSource.setField('filter', state.filters);
          
          // Update project routing for Vega visualizations
          if (vis.type.name === 'vega' && services.cps?.cpsManager) {
            const projectRouting = services.cps.cpsManager.getProjectRouting();
            vis.data.searchSource.setField('projectRouting', projectRouting);
          }
        }
        reloadVisualization();
        setHasUnsavedChanges(true);
      });

      const updateOnEmbeddableRendered = () => setIsEmbeddableRendered(true);
      eventEmitter.on('embeddableRendered', updateOnEmbeddableRendered);

      reloadVisualization();

      return () => {
        setIsEmbeddableRendered(false);
        eventEmitter.off('embeddableRendered', updateOnEmbeddableRendered);
        subscriptions.unsubscribe();
        vis.uiState.off('change', updateOnChange);
        unsubscribeStateUpdates();
        sessionSubscription.unsubscribe();
        cpsProjectRoutingSubscription?.unsubscribe();
      };
    }
  }, [appState, eventEmitter, visInstance, services, setHasUnsavedChanges, visEditorController]);

  return { isEmbeddableRendered, currentAppState };
};
