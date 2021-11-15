/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { PaletteOutput } from '../../../../../../src/plugins/charts/common';
import type { LensMultiTable, CustomPaletteParams, LayerType } from '../../types';
import { GaugeAppearanceResult, GAUGE_APPEARANCE_FUNCTION } from './gauge_appearance';

export const GAUGE_FUNCTION = 'lens_gauge';
export const GAUGE_FUNCTION_RENDERER = 'lens_gauge_renderer';

export type GaugeType = 'gauge';
export type GaugeShape = 'horizontalBullet' | 'verticalBullet';

export interface SharedGaugeLayerState {
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
  shape: GaugeShape;
  palette?: PaletteOutput<CustomPaletteParams>;
};

export type GaugeExpressionArgs = SharedGaugeLayerState & {
  title?: string;
  description?: string;
  shape: GaugeShape;
  palette?: PaletteOutput<CustomPaletteParams>;
};

export interface GaugeRender {
  type: 'render';
  as: typeof GAUGE_FUNCTION_RENDERER;
  value: GaugeExpressionProps;
}

export interface GaugeExpressionProps {
  data: LensMultiTable;
  args: GaugeExpressionArgs;
}

export const gauge: ExpressionFunctionDefinition<
  typeof GAUGE_FUNCTION,
  LensMultiTable,
  GaugeExpressionArgs,
  GaugeRender
> = {
  name: GAUGE_FUNCTION,
  type: 'render',
  help: i18n.translate('xpack.lens.gauge.expressionHelpLabel', {
    defaultMessage: 'Gauge renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    shape: {
      types: ['string'],
      options: ['horizontalBullet', 'verticalBullet'],
      help: '',
    },
    description: {
      types: ['string'],
      help: '',
    },
    metricAccessor: {
      types: ['string'],
      help: '',
    },
    minAccessor: {
      types: ['string'],
      help: '',
    },
    maxAccessor: {
      types: ['string'],
      help: '',
    },
    goalAccessor: {
      types: ['string'],
      help: '',
    },
    palette: {
      types: ['palette'],
      help: '',
    },
    appearance: {
      types: [GAUGE_APPEARANCE_FUNCTION],
      help: i18n.translate('xpack.lens.gaugeChart.appearance.help', {
        defaultMessage: 'Configure the gauge appearance.',
      }),
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: GaugeExpressionArgs) {
    return {
      type: 'render',
      as: GAUGE_FUNCTION_RENDERER,
      value: {
        data,
        args,
      },
    };
  },
};
