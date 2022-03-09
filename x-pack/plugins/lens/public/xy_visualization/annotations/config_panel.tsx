/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDatePicker, EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import moment from 'moment';
import { AnnotationConfig } from 'src/plugins/event_annotation/common/types';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State, XYState } from '../types';
import { FormatFactory } from '../../../common';
import { XYAnnotationLayerConfig } from '../../../common/expressions';
import { ColorPicker } from '../xy_config_panel/color_picker';
import { NameInput, useDebouncedValue } from '../../shared_components';
import { isHorizontalChart } from '../state_helpers';
import { MarkerDecorationSettings } from '../xy_config_panel/shared/marker_decoration_settings';
import { LineStyleSettings } from '../xy_config_panel/shared/line_style_settings';
import { updateLayer } from '../xy_config_panel';

const defaultLabel = i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
  defaultMessage: 'Static Annotation',
});

export const AnnotationsPanel = (
  props: VisualizationDimensionEditorProps<State> & {
    layer: XYAnnotationLayerConfig;
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) => {
  const { state, setState, layerId, accessor, layer } = props;
  const isHorizontal = isHorizontalChart(state.layers);

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: state,
    onChange: setState,
  });

  const index = localState.layers.findIndex((l) => l.layerId === layerId);

  const setConfig = useCallback(
    (config: Partial<AnnotationConfig> | undefined) => {
      if (config == null) {
        return;
      }
      const newConfigs = [...(layer.config || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = { ...newConfigs[existingIndex], ...config };
      } else {
        // that should never happen
        return;
      }
      setLocalState(updateLayer(localState, { ...layer, config: newConfigs }, index));
    },
    [accessor, index, localState, layer, setLocalState]
  );
  const currentConfig = layer.config?.find((c) => c.id === accessor);
  return (
    <>
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotationDate', {
          defaultMessage: 'Annotation date',
        })}
      >
        <EuiDatePicker
          showTimeSelect
          selected={moment(currentConfig?.key?.timestamp)}
          onChange={(date) => {
            if (date) {
              setConfig({
                key: { ...currentConfig?.key, timestamp: date?.valueOf() },
              });
            }
          }}
          dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
          data-test-subj="lnsXY_axisOrientation_groups"
        />
      </EuiFormRow>
      <NameInput
        value={currentConfig?.label || defaultLabel}
        defaultValue={defaultLabel}
        onChange={(value) => {
          setConfig({ label: value });
        }}
      />
      <MarkerDecorationSettings
        isHorizontal={isHorizontal}
        setConfig={setConfig}
        currentConfig={currentConfig}
      />
      <LineStyleSettings
        isHorizontal={isHorizontal}
        setConfig={setConfig}
        currentConfig={currentConfig}
      />
      <ColorPicker
        {...props}
        setConfig={setConfig}
        disableHelpTooltip
        label={i18n.translate('xpack.lens.xyChart.lineColor.label', {
          defaultMessage: 'Color',
        })}
      />
      <EuiFormRow
        label={i18n.translate('xpack.lens.xyChart.annotation.name', {
          defaultMessage: 'Hide annotation',
        })}
        display="columnCompressedSwitch"
      >
        <EuiSwitch
          compressed
          label={i18n.translate('xpack.lens.xyChart.annotation.name', {
            defaultMessage: 'Hide annotation',
          })}
          showLabel={false}
          data-test-subj="lns-annotations-hide-annotation"
          checked={Boolean(currentConfig?.isHidden)}
          onChange={(ev) => setConfig({ isHidden: ev.target.checked })}
        />
      </EuiFormRow>
    </>
  );
};
