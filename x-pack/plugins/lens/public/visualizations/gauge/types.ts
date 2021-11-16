/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensMultiTable,
  FormatFactory,
  CustomPaletteParams,
  LayerType,
} from '../../../common';
import type { GaugeAppearanceResult, GaugeColorMode, GaugeShape } from '../../../common/expressions';
import { GAUGE_CHART_TYPES, LENS_GAUGE_RENDERER } from './constants';
import type {
  CustomPaletteState,
  ChartsPluginSetup,
  PaletteRegistry,
  PaletteOutput
} from 'src/plugins/charts/public';

export type GaugeTypes = typeof GAUGE_CHART_TYPES[keyof typeof GAUGE_CHART_TYPES];

export interface SharedGaugeLayerState {
  shape: GaugeShape;
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  appearance: GaugeAppearanceResult;
  colorMode?: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
}

export type GaugeLayerState = SharedGaugeLayerState & {
  layerId: string;
  layerType: LayerType;
};

export type GaugeVisualizationState = GaugeLayerState & {
  palette?: PaletteOutput<CustomPaletteParams>;
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
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
};
