/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { InlineEditLensEmbeddableContext, LensPublicStart } from '@kbn/lens-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { visualizationWrapperStyles } from './styles';
import { VisualizationActions } from './visualization_actions';
import { openEditVisualization } from './edit_visualization_button';
import { VisualizationTimeRangePicker } from './visualization_time_range_picker';
import type { VisualizationTimeRangeControl } from './use_time_range';

const VISUALIZATION_HEIGHT = 240;

export interface VisualizationActionHandlers {
  canWriteDashboards: boolean;
  saveToDashboard: () => void;
  viewConfiguration: () => void;
}

interface BaseVisualizationProps {
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (input: TypedLensByValueInput) => void;
  isLoading: boolean;
  shouldShowActions?: boolean;
  onActionHandlersChange?: (handlers: VisualizationActionHandlers | undefined) => void;
  timeRangeControl?: VisualizationTimeRangeControl;
}

export function BaseVisualization({
  lens,
  uiActions,
  lensInput,
  setLensInput,
  isLoading,
  shouldShowActions = false,
  onActionHandlersChange,
  timeRangeControl,
}: BaseVisualizationProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const {
    services: { application },
  } = useKibana();
  const canWriteDashboards = application?.capabilities.dashboard_v2?.showWriteControls === true;
  const selectedTimeRange = timeRangeControl?.selectedTimeRange;
  const lensInputWithTimeRange = useMemo(
    () =>
      lensInput && selectedTimeRange ? { ...lensInput, timeRange: selectedTimeRange } : lensInput,
    [lensInput, selectedTimeRange]
  );

  const onLoad = useCallback(
    (
      _isLoading: boolean,
      adapters: InlineEditLensEmbeddableContext['lensEvent']['adapters'] | undefined,
      dataLoading$?: InlineEditLensEmbeddableContext['lensEvent']['dataLoading$']
    ) => {
      if (!_isLoading && adapters?.tables?.tables) {
        setLensLoadEvent({ adapters, dataLoading$ });
      }
    },
    []
  );

  const onOpenSave = useCallback(() => setIsSaveModalOpen(true), []);
  const onCloseSave = useCallback(() => setIsSaveModalOpen(false), []);
  const saveToDashboard = useCallback(() => {
    if (canWriteDashboards) {
      onOpenSave();
    }
  }, [canWriteDashboards, onOpenSave]);
  const viewConfiguration = useCallback(() => {
    if (!lensInput) {
      return;
    }

    openEditVisualization({
      uiActions,
      lensInput,
      lensLoadEvent,
      onAttributesChange: (attrs) => setLensInput({ ...lensInput, attributes: attrs }),
      onApply: onOpenSave,
      canWriteDashboards,
    });
  }, [canWriteDashboards, lensInput, lensLoadEvent, onOpenSave, setLensInput, uiActions]);

  useEffect(() => {
    if (!onActionHandlersChange) {
      return;
    }

    if (isLoading || !lensInput) {
      onActionHandlersChange(undefined);
      return;
    }

    onActionHandlersChange({
      canWriteDashboards,
      saveToDashboard,
      viewConfiguration,
    });

    return () => onActionHandlersChange(undefined);
  }, [
    canWriteDashboards,
    isLoading,
    lensInput,
    onActionHandlersChange,
    saveToDashboard,
    viewConfiguration,
  ]);

  return (
    <>
      {timeRangeControl && (
        <VisualizationTimeRangePicker
          selectedTimeRange={timeRangeControl.selectedTimeRange}
          onTimeChange={timeRangeControl.onTimeChange}
        />
      )}
      <div
        data-test-subj="lensVisualization"
        css={visualizationWrapperStyles(VISUALIZATION_HEIGHT)}
      >
        {!isLoading && lensInput && shouldShowActions && (
          <VisualizationActions
            onSave={onOpenSave}
            uiActions={uiActions}
            lensInput={lensInput}
            lensLoadEvent={lensLoadEvent}
            setLensInput={setLensInput}
          />
        )}
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          lensInputWithTimeRange && (
            <lens.EmbeddableComponent
              {...lensInputWithTimeRange}
              style={{ height: '100%' }}
              onBrushEnd={timeRangeControl?.onBrushEnd}
              onLoad={onLoad}
            />
          )
        )}
      </div>
      {isSaveModalOpen && lensInputWithTimeRange && (
        <lens.SaveModalComponent
          initialInput={lensInputWithTimeRange}
          onClose={onCloseSave}
          isSaveable={false}
        />
      )}
    </>
  );
}
