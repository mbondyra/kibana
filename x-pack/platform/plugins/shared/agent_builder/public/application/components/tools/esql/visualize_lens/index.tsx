/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useLensInput } from './use_lens_input';
import { BaseVisualization, type VisualizationActionHandlers } from '../shared/base_visualization';
import { useTimeRange } from '../shared/use_time_range';

export function VisualizeLens({
  lens,
  dataViews,
  uiActions,
  lensConfig,
  timeRange,
  onActionHandlersChange,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  uiActions: UiActionsStart;
  lensConfig: any;
  timeRange?: TimeRange;
  onActionHandlersChange?: (handlers: VisualizationActionHandlers | undefined) => void;
}) {
  const { lensInput, setLensInput, isLoading, error } = useLensInput({
    lens,
    dataViews,
    lensConfig,
    timeRange,
  });
  const timeRangeControl = useTimeRange({ timeRange });

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.agentBuilder.visualizeLens.error.title', {
          defaultMessage: 'Unable to render visualization',
        })}
        color="danger"
        iconType="error"
        size="s"
        announceOnMount
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  return (
    <BaseVisualization
      lens={lens}
      uiActions={uiActions}
      lensInput={lensInput}
      setLensInput={setLensInput}
      isLoading={isLoading}
      onActionHandlersChange={onActionHandlersChange}
      timeRangeControl={timeRangeControl}
    />
  );
}
