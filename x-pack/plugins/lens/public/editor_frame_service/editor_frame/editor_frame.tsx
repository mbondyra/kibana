/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CoreStart } from 'kibana/public';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { Datasource, FramePublicAPI, Visualization } from '../../types';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { DragDropIdentifier, RootDragDropProvider } from '../../drag_drop';
import { generateId } from '../../id_generator';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';
import { EditorFrameStartPlugins } from '../service';
import { createDatasourceLayers } from './state_helpers';
import {
  getVisualizeFieldSuggestions,
  getTopSuggestionForField,
  switchToSuggestion,
  Suggestion,
} from './suggestion_helpers';
import { trackUiEvent } from '../../lens_ui_telemetry';
import {
  useLensSelector,
  useLensDispatch,
  updateLayer,
  updateVisualizationState,
} from '../../state_management';

export interface EditorFrameProps {
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  ExpressionRenderer: ReactExpressionRendererType;
  palettes: PaletteRegistry;
  core: CoreStart;
  plugins: EditorFrameStartPlugins;
  showNoDataPopover: () => void;
  initialContext?: VisualizeFieldContext;
}

export function EditorFrame(props: EditorFrameProps) {
  const lensState = useLensSelector((state) => state.app);
  const {
    filters,
    query,
    resolvedDateRange: dateRange,
    searchSessionId,
    persistedDoc,
    activeData,
    title,
    activeDatasourceId,
    visualization,
    datasourceStates,
    stagedPreview,
    isFullscreenDatasource,
  } = lensState;
  const dispatchLens = useLensDispatch();

  const [visualizeTriggerFieldContext, setVisualizeTriggerFieldContext] = useState(
    props.initialContext
  );
  const activeVisualization =
    visualization.activeId && props.visualizationMap[visualization.activeId];

  const allLoaded = Object.values(datasourceStates).every(
    ({ isLoading }) => typeof isLoading === 'boolean' && !isLoading
  );

  const datasourceLayers = createDatasourceLayers(props.datasourceMap, datasourceStates);

  const framePublicAPI: FramePublicAPI = {
    datasourceLayers,
    activeData,
    dateRange,
    query,
    filters,
    searchSessionId,
    availablePalettes: props.palettes,

    addNewLayer() {
      const newLayerId = generateId();
      dispatchLens(
        updateLayer({
          datasourceId: activeDatasourceId!,
          layerId: newLayerId,
          updater: props.datasourceMap[activeDatasourceId!].insertLayer,
        })
      );

      return newLayerId;
    },

    removeLayers(layerIds: string[]) {
      if (activeVisualization && activeVisualization.removeLayer && visualization.state) {
        dispatchLens(
          updateVisualizationState({
            visualizationId: activeVisualization.id,
            updater: layerIds.reduce(
              (acc, layerId) =>
                activeVisualization.removeLayer
                  ? activeVisualization.removeLayer(acc, layerId)
                  : acc,
              visualization.state
            ),
          })
        );
      }
      layerIds.forEach((layerId) => {
        const layerDatasourceId = Object.entries(props.datasourceMap).find(
          ([datasourceId, datasource]) => {
            return (
              datasourceStates[datasourceId] &&
              datasource.getLayers(datasourceStates[datasourceId].state).includes(layerId)
            );
          }
        )![0];
        dispatchLens(
          updateLayer({
            layerId,
            datasourceId: layerDatasourceId,
            updater: props.datasourceMap[layerDatasourceId].removeLayer,
          })
        );
      });
    },
  };

  // Get suggestions for visualize field when all datasources are ready
  useEffect(() => {
    if (allLoaded && visualizeTriggerFieldContext && !persistedDoc) {
      const selectedSuggestion = getVisualizeFieldSuggestions({
        datasourceMap: props.datasourceMap,
        datasourceStates,
        visualizationMap: props.visualizationMap,
        activeVisualizationId: visualization.activeId,
        visualizationState: visualization.state,
        visualizeTriggerFieldContext,
      });
      if (selectedSuggestion) {
        switchToSuggestion(dispatchLens, selectedSuggestion, 'SWITCH_VISUALIZATION');
      }
      setVisualizeTriggerFieldContext(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded]);

  // Using a ref to prevent rerenders in the child components while keeping the latest state
  const getSuggestionForField = useRef<(field: DragDropIdentifier) => Suggestion | undefined>();
  getSuggestionForField.current = (field: DragDropIdentifier) => {
    const activeVisualizationId = visualization.activeId;
    const visualizationState = visualization.state;
    const { visualizationMap, datasourceMap } = props;

    if (!field || !activeDatasourceId) {
      return;
    }

    return getTopSuggestionForField(
      datasourceLayers,
      activeVisualizationId,
      visualizationMap,
      visualizationState,
      datasourceMap[activeDatasourceId],
      datasourceStates,
      field
    );
  };

  const hasSuggestionForField = useCallback(
    (field: DragDropIdentifier) => getSuggestionForField.current!(field) !== undefined,
    [getSuggestionForField]
  );

  const dropOntoWorkspace = useCallback(
    (field) => {
      const suggestion = getSuggestionForField.current!(field);
      if (suggestion) {
        trackUiEvent('drop_onto_workspace');
        switchToSuggestion(dispatchLens, suggestion, 'SWITCH_VISUALIZATION');
      }
    },
    [getSuggestionForField, dispatchLens]
  );

  return (
    <RootDragDropProvider>
      <FrameLayout
        isFullscreen={Boolean(isFullscreenDatasource)}
        dataPanel={
          <DataPanelWrapper
            datasourceMap={props.datasourceMap}
            activeDatasource={activeDatasourceId}
            datasourceState={activeDatasourceId ? datasourceStates[activeDatasourceId].state : null}
            datasourceIsLoading={
              activeDatasourceId ? datasourceStates[activeDatasourceId].isLoading : true
            }
            core={props.core}
            query={query}
            dateRange={dateRange}
            filters={filters}
            showNoDataPopover={props.showNoDataPopover}
            dropOntoWorkspace={dropOntoWorkspace}
            hasSuggestionForField={hasSuggestionForField}
            plugins={props.plugins}
          />
        }
        configPanel={
          allLoaded && (
            <ConfigPanelWrapper
              activeDatasourceId={activeDatasourceId!}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
              visualizationMap={props.visualizationMap}
              activeVisualizationId={visualization.activeId}
              visualizationState={visualization.state}
              framePublicAPI={framePublicAPI}
              core={props.core}
              isFullscreen={Boolean(isFullscreenDatasource)}
            />
          )
        }
        workspacePanel={
          allLoaded && (
            <WorkspacePanel
              title={title}
              activeDatasourceId={activeDatasourceId}
              activeVisualizationId={visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
              framePublicAPI={framePublicAPI}
              visualizationState={visualization.state}
              visualizationMap={props.visualizationMap}
              isFullscreen={Boolean(isFullscreenDatasource)}
              ExpressionRenderer={props.ExpressionRenderer}
              core={props.core}
              plugins={props.plugins}
              visualizeTriggerFieldContext={visualizeTriggerFieldContext}
              getSuggestionForField={getSuggestionForField.current}
            />
          )
        }
        suggestionsPanel={
          allLoaded && (
            <SuggestionPanel
              frame={framePublicAPI}
              activeDatasourceId={activeDatasourceId}
              activeVisualizationId={visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
              visualizationState={visualization.state}
              visualizationMap={props.visualizationMap}
              ExpressionRenderer={props.ExpressionRenderer}
              stagedPreview={stagedPreview}
              plugins={props.plugins}
            />
          )
        }
      />
    </RootDragDropProvider>
  );
}
