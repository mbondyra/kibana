/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import type { OnTimeChangeProps, UseEuiTheme } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { css } from '@emotion/react';

export function VisualizationTimeRangePicker({
  selectedTimeRange,
  onTimeChange,
}: {
  selectedTimeRange: TimeRange;
  onTimeChange: ({ start, end }: OnTimeChangeProps) => void;
}) {
  return (
    <div
      css={({ euiTheme }: UseEuiTheme) =>
        css({
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
          marginBlockStart: euiTheme.size.base,
          marginBlockEnd: euiTheme.size.s,
          paddingInline: euiTheme.size.base,
        })
      }
    >
      <EuiSuperDatePicker
        data-test-subj="agentBuilderVisualizeLensTimeRangePicker"
        start={selectedTimeRange.from}
        end={selectedTimeRange.to}
        onTimeChange={onTimeChange}
        onRefresh={() => undefined}
        showUpdateButton={false}
        compressed
        width="auto"
      />
    </div>
  );
}
