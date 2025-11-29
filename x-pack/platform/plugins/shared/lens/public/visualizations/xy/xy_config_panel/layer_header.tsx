/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, EuiIconTip, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { IconChartBarReferenceLine, IconChartBarAnnotations } from '@kbn/chart-icons';
import { css } from '@emotion/react';
import type {
  VisualizationLayerHeaderContentProps,
  VisualizationLayerWidgetProps,
} from '@kbn/lens-common';
import { ProjectPickerButton, ProjectPickerContent, PROJECT_ROUTING } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { getIgnoreGlobalFilterIcon } from '../../../shared_components/ignore_global_filter/data_view_picker_icon';
import type { XYState, XYAnnotationLayerConfig } from '../types';
import { annotationLayerHasUnsavedChanges } from '../state_helpers';
import { ChangeIndexPattern, StaticHeader, FlyoutContainer } from '../../../shared_components';
import {
  getAnnotationLayerTitle,
  isAnnotationsLayer,
  isReferenceLayer,
} from '../visualization_helpers';
import { cpsService } from '../../../cps_service';

export function LayerHeader(props: VisualizationLayerWidgetProps<XYState>) {
  const layer = props.state.layers.find((l) => l.layerId === props.layerId);
  if (!layer) {
    return null;
  }
  if (isReferenceLayer(layer)) {
    return <ReferenceLayerHeader />;
  }
  if (isAnnotationsLayer(layer)) {
    return (
      <AnnotationsLayerHeader
        title={getAnnotationLayerTitle(layer)}
        hasUnsavedChanges={annotationLayerHasUnsavedChanges(layer)}
      />
    );
  }
  return null;
}

export function LayerHeaderContent(props: VisualizationLayerHeaderContentProps<XYState>) {
  const layer = props.state.layers.find((l) => l.layerId === props.layerId);
  if (layer && isAnnotationsLayer(layer)) {
    return <AnnotationLayerHeaderContent {...props} />;
  }
  return null;
}

export function ReferenceLayerHeader() {
  return (
    <StaticHeader
      icon={IconChartBarReferenceLine}
      label={i18n.translate('xpack.lens.xyChart.layerReferenceLineLabel', {
        defaultMessage: 'Reference lines',
      })}
    />
  );
}

export function AnnotationsLayerHeader({
  title,
  hasUnsavedChanges,
}: {
  title: string | undefined;
  hasUnsavedChanges: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <StaticHeader
      icon={IconChartBarAnnotations}
      label={
        title ||
        i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
          defaultMessage: 'Annotations',
        })
      }
      indicator={
        hasUnsavedChanges && (
          <div
            css={css`
              padding-bottom: 3px;
              padding-left: 4px;
            `}
          >
            <EuiIconTip
              content={i18n.translate('xpack.lens.xyChart.unsavedChanges', {
                defaultMessage: 'Unsaved changes',
              })}
              type="dot"
              color={euiTheme.colors.success}
            />
          </div>
        )
      }
    />
  );
}

function AnnotationLayerHeaderContent({
  frame,
  state,
  layerId,
  onChangeIndexPattern,
  setState,
}: VisualizationLayerHeaderContentProps<XYState>) {
  const { euiTheme } = useEuiTheme();
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);

  const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[layerIndex] as XYAnnotationLayerConfig;

  // Initialize from layer.projectRouting if it exists, otherwise from cpsManager
  const [projectRouting, setProjectRouting] = useState<ProjectRouting>(
    layer.projectRouting ?? cpsService?.cpsManager?.getProjectRouting() ?? PROJECT_ROUTING.ALL
  );

  // Initialize isOverrideEnabled based on whether layer.projectRouting exists
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(layer.projectRouting !== undefined);

  // When layer.projectRouting is undefined, sync with cpsManager
  useEffect(() => {
    if (layer.projectRouting === undefined && cpsService?.cpsManager) {
      const subscription = cpsService.cpsManager.getProjectRouting$().subscribe((routing) => {
        if (routing !== undefined) {
          setProjectRouting(routing);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [layer.projectRouting]);

  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  const currentIndexPattern = frame.dataViews.indexPatterns[layer.indexPatternId];

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {cpsService?.cpsManager && (
          <EuiFlexItem grow={false}>
            <ProjectPickerButton
              linkedProjectsCount={0}
              onClick={() => setIsProjectPickerOpen(true)}
              variant="lens"
              projectRouting={layer.projectRouting ?? projectRouting}
              hasOverride={layer.projectRouting !== undefined}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true}>
          <ChangeIndexPattern
            data-test-subj="indexPattern-switcher"
            trigger={{
              label: currentIndexPattern?.name || notFoundTitleLabel,
              title: currentIndexPattern?.title || notFoundTitleLabel,
              'data-test-subj': 'lns_layerIndexPatternLabel',
              size: 's',
              fontWeight: 'normal',
              extraIcons: layer.ignoreGlobalFilters
                ? [
                    getIgnoreGlobalFilterIcon({
                      color: euiTheme.colors.disabledText,
                      dataTestSubj: 'lnsChangeIndexPatternIgnoringFilters',
                    }),
                  ]
                : undefined,
            }}
            indexPatternId={layer.indexPatternId}
            indexPatternRefs={frame.dataViews.indexPatternRefs}
            isMissingCurrent={!currentIndexPattern}
            onChangeIndexPattern={onChangeIndexPattern}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {cpsService?.cpsManager && (
        <FlyoutContainer
          isOpen={isProjectPickerOpen}
          handleClose={() => setIsProjectPickerOpen(false)}
          label={i18n.translate('xpack.lens.layerPanel.crossProjectSearchScope', {
            defaultMessage: 'Cross-project search scope',
          })}
          isFullscreen={false}
          isInlineEditing={true}
          customHeaderAction={
            <EuiSwitch
              label={i18n.translate('xpack.lens.layerPanel.overrideGlobalScope', {
                defaultMessage: 'Override global scope',
              })}
              checked={isOverrideEnabled}
              onChange={(e) => {
                const newValue = e.target.checked;
                if (!setState) return;

                if (newValue && cpsService?.cpsManager) {
                  // When enabling override, set layer.projectRouting to current global value
                  const currentRouting = cpsService.cpsManager.getProjectRouting();
                  if (currentRouting !== undefined) {
                    setProjectRouting(currentRouting);
                    const newLayers = [...state.layers];
                    newLayers[layerIndex] = { ...layer, projectRouting: currentRouting };
                    setState({ ...state, layers: newLayers });
                  }
                } else {
                  // When disabling override, remove layer.projectRouting
                  const newLayers = [...state.layers];
                  newLayers[layerIndex] = { ...layer, projectRouting: undefined };
                  setState({ ...state, layers: newLayers });
                }
                setIsOverrideEnabled(newValue);
              }}
              compressed
              data-test-subj="lns-project-picker-override-toggle"
            />
          }
        >
          <ProjectPickerContent
            projectRouting={projectRouting}
            onProjectRoutingChange={(routing) => {
              if (layer.projectRouting !== undefined && setState) {
                // Only update layer if projectRouting is set (override enabled)
                setProjectRouting(routing);
                const newLayers = [...state.layers];
                newLayers[layerIndex] = { ...layer, projectRouting: routing };
                setState({ ...state, layers: newLayers });
              }
            }}
            fetchProjects={async () => {
              return await cpsService!.cpsManager!.fetchProjects();
            }}
            isReadonly={!isOverrideEnabled}
            hideTitle={true}
          />
        </FlyoutContainer>
      )}
    </>
  );
}
