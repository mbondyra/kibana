/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomPaletteState,
  PaletteOutput,
} from '../../../../../../src/plugins/charts/common';
import type { LensBrushEvent, LensFilterEvent } from '../../types';
import type {
  LensMultiTable,
  FormatFactory,
  CustomPaletteParams,
  LayerType,
} from '../../../common';
import type { GaugeAppearanceResult, GaugeShape } from '../../../common/expressions';
import { GAUGE_CHART_TYPES, LENS_GAUGE_RENDERER } from './constants';
import type {
  ChartsPluginSetup,
  PaletteRegistry,
} from '../../../../../../src/plugins/charts/public';

export type GaugeTypes = typeof GAUGE_CHART_TYPES[keyof typeof GAUGE_CHART_TYPES];

export interface SharedGaugeLayerState {
  shape: GaugeShape;
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  appearance: GaugeAppearanceResult;
}

export type GaugeLayerState = SharedGaugeLayerState & {
  layerId: string;
  layerType: LayerType;
};

export type GaugeVisualizationState = GaugeLayerState & {
  // need to store the current accessor to reset the color stops at accessor change
  palette?: PaletteOutput<CustomPaletteParams> & { accessor: string };
  shape: 'horizontalBullet' | 'verticalBullet';
};

export type GaugeExpressionArgs = SharedGaugeLayerState & {
  title?: string;
  description?: string;
  palette: PaletteOutput<CustomPaletteState>;
};

export interface GaugeRender {
  type: 'render';
  as: typeof LENS_GAUGE_RENDERER;
  value: GaugeExpressionProps;
}

export interface GaugeExpressionProps {
  data: LensMultiTable;
  args: GaugeExpressionArgs;
}

export type GaugeRenderProps = GaugeExpressionProps & {
  timeZone: string;
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  onClickValue: (data: LensFilterEvent['data']) => void;
  onSelectRange: (data: LensBrushEvent['data']) => void;
  paletteService: PaletteRegistry;
};
