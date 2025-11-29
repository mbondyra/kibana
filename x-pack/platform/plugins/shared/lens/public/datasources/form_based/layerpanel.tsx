/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { RandomSamplingIcon } from '@kbn/random-sampling';
import type { DatasourceLayerPanelProps, FormBasedPrivateState } from '@kbn/lens-common';
import { ProjectPickerButton, ProjectPickerContent, PROJECT_ROUTING } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { ChangeIndexPattern } from '../../shared_components/dataview_picker/dataview_picker';
import { FlyoutContainer } from '../../shared_components/flyout_container';
import { getSamplingValue } from './utils';
import { getIgnoreGlobalFilterIcon } from '../../shared_components/ignore_global_filter';
import { cpsService } from '../../cps_service';

export interface FormBasedLayerPanelProps extends DatasourceLayerPanelProps<FormBasedPrivateState> {
  state: FormBasedPrivateState;
  onChangeIndexPattern: (newId: string) => void;
  setState?: (newState: FormBasedPrivateState) => void;
}

export function LayerPanel({
  state,
  layerId,
  onChangeIndexPattern,
  dataViews,
  setState,
}: FormBasedLayerPanelProps) {
  const layer = state.layers[layerId];
  const { euiTheme } = useEuiTheme();
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);

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

  const indexPattern = dataViews.indexPatterns[layer.indexPatternId];
  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  const indexPatternRefs = dataViews.indexPatternRefs.map((ref) => {
    const isPersisted = dataViews.indexPatterns[ref.id]?.isPersisted ?? true;
    return {
      ...ref,
      isAdhoc: !isPersisted,
    };
  });

  const samplingValue = getSamplingValue(layer);
  const extraIcons = [];
  if (layer.ignoreGlobalFilters) {
    extraIcons.push(
      getIgnoreGlobalFilterIcon({
        color: euiTheme.colors.disabledText,
        dataTestSubj: 'lnsChangeIndexPatternIgnoringFilters',
      })
    );
  }
  if (samplingValue !== 1) {
    extraIcons.push({
      component: <RandomSamplingIcon color={euiTheme.colors.disabledText} fill="currentColor" />,
      value: `${samplingValue * 100}%`,
      tooltipValue: i18n.translate('xpack.lens.indexPattern.randomSamplingInfo', {
        defaultMessage: '{value}% sampling',
        values: {
          value: samplingValue * 100,
        },
      }),
      'data-test-subj': 'lnsChangeIndexPatternSamplingInfo',
    });
  }

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
              label: indexPattern?.name || notFoundTitleLabel,
              title: indexPattern?.title || notFoundTitleLabel,
              'data-test-subj': 'lns_layerIndexPatternLabel',
              size: 's',
              fontWeight: 'normal',
              extraIcons,
            }}
            indexPatternId={layer.indexPatternId}
            indexPatternRefs={indexPatternRefs}
            isMissingCurrent={!indexPattern}
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
                    setState({
                      ...state,
                      layers: {
                        ...state.layers,
                        [layerId]: {
                          ...layer,
                          projectRouting: currentRouting,
                        },
                      },
                    });
                  }
                } else {
                  // When disabling override, remove layer.projectRouting
                  setState({
                    ...state,
                    layers: {
                      ...state.layers,
                      [layerId]: {
                        ...layer,
                        projectRouting: undefined,
                      },
                    },
                  });
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
                setState({
                  ...state,
                  layers: {
                    ...state.layers,
                    [layerId]: {
                      ...layer,
                      projectRouting: routing,
                    },
                  },
                });
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
