/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover, VisLabel } from '../../../shared_components';
import type { GaugeVisualizationState } from '../types';
import './gauge_config_panel.scss';

type LabelMode = 'none' | 'custom' | 'auto';

const ticksPositionOptions: Array<{
  id: string;
  value: 'auto' | 'bands' | 'none';
  label: string;
}> = [
  {
    id: `gauge_ticks_auto`,
    value: 'auto',
    label: i18n.translate('xpack.lens.gaugeChart.ticks.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: `gauge_ticks_none`,
    value: 'none',
    label: i18n.translate('xpack.lens.gaugeChart.ticks.none', {
      defaultMessage: 'None',
    }),
  },
  {
    id: `gauge_ticks_bands`,
    value: 'bands',
    label: i18n.translate('xpack.lens.gaugeChart.ticks.bands', {
      defaultMessage: 'On band colors',
    }),
  },
];

export const GaugeToolbar = memo((props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  const { state, setState, frame } = props;
  const metricAccessor = state.metricAccessor;
  const metricDimensionTitle =
    state.layerId &&
    frame.activeData?.[state.layerId]?.columns.find((col) => col.id === metricAccessor)?.name;

  const [subtitleMode, setSubtitleMode] = useState<LabelMode>(() =>
    state.appearance.subtitle ? 'custom' : 'none'
  );

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <ToolbarPopover
            handleClose={() => {
              setSubtitleMode(state.appearance.subtitle ? 'custom' : 'none');
            }}
            title={i18n.translate('xpack.lens.gauge.appearanceLabel', {
              defaultMessage: 'Appearance',
            })}
            type="visualOptions"
            buttonDataTestSubj="lnsVisualOptionsButton"
            panelClassName="lnsGaugeToolbar__popover"
          >
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.gauge.title.header', {
                defaultMessage: 'Title',
              })}
              fullWidth
            >
              <VisLabel
                label={state.appearance.title || ''}
                mode={state.appearance.titleMode}
                placeholder={metricDimensionTitle || ''}
                hasAutoOption={true}
                handleChange={(value) => {
                  setState({
                    ...state,
                    appearance: {
                      ...state.appearance,
                      title: value.label,
                      titleMode: value.mode,
                    },
                  });
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.gauge.subtitle.header', {
                defaultMessage: 'Subtitle',
              })}
            >
              <VisLabel
                header={i18n.translate('xpack.lens.label.gauge.subtitle.header', {
                  defaultMessage: 'Subtitle',
                })}
                label={state.appearance.subtitle || ''}
                mode={subtitleMode}
                handleChange={(value) => {
                  setState({
                    ...state,
                    appearance: {
                      ...state.appearance,
                      subtitle: value.label,
                    },
                  });
                  setSubtitleMode(value.mode);
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.shared.ticksPositionOptions', {
                defaultMessage: 'Ticks',
              })}
            >
              <EuiButtonGroup
                isFullWidth
                legend={i18n.translate('xpack.lens.shared.ticksPositionOptions', {
                  defaultMessage: 'Ticks',
                })}
                data-test-subj="lens-ticks-display-btn"
                name="ticksDisplay"
                buttonSize="compressed"
                options={ticksPositionOptions}
                idSelected={state.appearance.ticksPosition}
                onChange={(value) => {
                  setState({
                    ...state,
                    appearance: {
                      ...state.appearance,
                      ticksPosition: value.replace(/gauge_ticks_/g, ''),
                    },
                  });
                }}
              />
            </EuiFormRow>
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
