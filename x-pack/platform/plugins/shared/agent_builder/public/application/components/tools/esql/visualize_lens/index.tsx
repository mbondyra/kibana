/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiSuperDatePicker, type OnTimeChangeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useLensInput } from './use_lens_input';
import { BaseVisualization } from '../shared/base_visualization';

const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-24h', to: 'now' };

export function VisualizeLens({
  lens,
  dataViews,
  uiActions,
  lensConfig,
  timeRange,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  uiActions: UiActionsStart;
  lensConfig: any;
  timeRange?: TimeRange;
}) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    () => timeRange ?? DEFAULT_TIME_RANGE
  );
  const externalTimeRange = timeRange ?? DEFAULT_TIME_RANGE;

  useEffect(() => {
    setSelectedTimeRange((currentTimeRange) =>
      currentTimeRange.from === externalTimeRange.from &&
      currentTimeRange.to === externalTimeRange.to
        ? currentTimeRange
        : externalTimeRange
    );
  }, [externalTimeRange]);

  const { lensInput, setLensInput, isLoading, error } = useLensInput({
    lens,
    dataViews,
    lensConfig,
    timeRange: selectedTimeRange,
  });

  const onTimeChange = ({ start, end }: OnTimeChangeProps) => {
    setSelectedTimeRange({ from: start, to: end });
  };

  if (error) {
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.agentBuilder.visualizeLens.error.title', {
          defaultMessage: 'Unable to render visualization',
        })}
        color="danger"
        iconType="error"
        size="s"
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiSuperDatePicker
        data-test-subj="agentBuilderVisualizeLensTimeRangePicker"
        start={selectedTimeRange.from}
        end={selectedTimeRange.to}
        onTimeChange={onTimeChange}
        onRefresh={() => undefined}
        width="full"
        showUpdateButton="iconOnly"
      />
      <EuiSpacer size="s" />
      <BaseVisualization
        lens={lens}
        uiActions={uiActions}
        lensInput={lensInput}
        setLensInput={setLensInput}
        isLoading={isLoading}
      />
    </>
  );
}
