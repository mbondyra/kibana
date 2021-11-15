/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiColorPaletteDisplay,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import {
  CustomizablePalette,
  applyPaletteParams,
  defaultPaletteParams,
  FIXED_PROGRESSION,
  getStopsForFixedMode,
  useDebouncedValue,
  PalettePanelContainer,
  findMinMaxByColumnId,
} from '../../shared_components/';
import './dimension_editor.scss';
import type { GaugeVisualizationState } from './types';

export function GaugeDimensionEditor(
  props: VisualizationDimensionEditorProps<GaugeVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  if (state?.metricAccessor !== accessor) return null;

  const currentData = frame.activeData?.[state.layerId];

  const activePalette = state?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
  };

  const currentMinMaxBounds = {
    min: 0,
    max: 100,
    fallback: false,
  }
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMaxBounds);

  return (
    <EuiFormRow
      className="lnsDynamicColoringRow"
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.paletteGaugeGradient.label', {
        defaultMessage: 'Color',
      })}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        className="lnsDynamicColoringClickable"
      >
        <EuiFlexItem>
          <EuiColorPaletteDisplay
            data-test-subj="lnsGauge_dynamicColoring_palette"
            palette={getStopsForFixedMode(displayStops, activePalette?.params?.colorStops)}
            type={FIXED_PROGRESSION}
            onClick={() => {
              setIsPaletteOpen(!isPaletteOpen);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="lnsGauge_dynamicColoring_trigger"
            aria-label={i18n.translate('xpack.lens.paletteGaugeGradient.customizeLong', {
              defaultMessage: 'Edit palette',
            })}
            iconType="controlsHorizontal"
            onClick={() => {
              setIsPaletteOpen(!isPaletteOpen);
            }}
            size="xs"
            flush="both"
          >
            {i18n.translate('xpack.lens.paletteGaugeGradient.customize', {
              defaultMessage: 'Edit',
            })}
          </EuiButtonEmpty>
          <PalettePanelContainer
            siblingRef={props.panelRef}
            isOpen={isPaletteOpen}
            handleClose={() => setIsPaletteOpen(!isPaletteOpen)}
          >
            <CustomizablePalette
              palettes={props.paletteService}
              activePalette={activePalette}
              dataBounds={currentMinMaxBounds}
              showContinuity={false}
              setPalette={(newPalette) => {
                setState({
                  ...state,
                  palette: newPalette,
                });
              }}
            />
          </PalettePanelContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
