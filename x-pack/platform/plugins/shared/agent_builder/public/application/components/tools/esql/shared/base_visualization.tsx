/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { InlineEditLensEmbeddableContext, LensPublicStart } from '@kbn/lens-plugin/public';
import React, { useCallback, useState } from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { visualizationWrapper } from './styles';
import { VisualizationActions } from './visualization_actions';
import { VisualizationTimeRangePicker } from './visualization_time_range_picker';
import { useTimeRange, type VisualizationTimeRangeControl } from './use_time_range';
import { TimeRange } from '@kbn/agent-builder-common';

const VISUALIZATION_HEIGHT = 240;

interface BaseVisualizationProps {
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (input: TypedLensByValueInput) => void;
  isLoading: boolean;
  timeRangeControl?: VisualizationTimeRangeControl;
  timeRange?: TimeRange;
}

export function BaseVisualization({
  lens,
  uiActions,
  lensInput,
  setLensInput,
  isLoading,
  timeRange,
}: BaseVisualizationProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const { euiTheme } = useEuiTheme();
  console.log('timeRange', timeRange);
  const timeRangeControl = useTimeRange({ timeRange });
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
        {!isLoading && lensInput && (
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
