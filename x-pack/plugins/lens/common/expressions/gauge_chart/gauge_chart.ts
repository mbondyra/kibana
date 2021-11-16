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
export type GaugeColorMode = 'none' | 'palette' | 'single';

export interface SharedGaugeLayerState {
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
  shape: GaugeShape;
};

export type GaugeExpressionArgs = SharedGaugeLayerState & {
  title?: string;
  description?: string;
  shape: GaugeShape;
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
      help: i18n.translate('xpack.lens.gauge.title.help', {
        defaultMessage: 'Saved gauge title',
      }),
    },
    shape: {
      types: ['string'],
      options: ['horizontalBullet', 'verticalBullet'],
      help: i18n.translate('xpack.lens.gauge.shape.help', {
        defaultMessage: 'Type of gauge chart',
      }),
    },
    description: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.description.help', {
        defaultMessage: 'Saved gauge description',
      }),
    },
    metricAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.metricAccessor.help', {
        defaultMessage: 'Current value',
      }),
    },
    minAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.minAccessor.help', {
        defaultMessage: 'Minimum value',
      }),
    },
    maxAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.maxAccessor.help', {
        defaultMessage: 'Maximum value',
      }),
    },
    goalAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.goalAccessor.help', {
        defaultMessage: 'Goal value',
      }),
    },
    colorMode: {
      types: ['string'],
      default: 'none',
      options: ['none', 'palette', 'single'],
      help: i18n.translate('xpack.lens.gauge.colorMode.help', {
        defaultMessage: 'Which part of gauge to color',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('xpack.lens.metric.palette.help', {
        defaultMessage: 'Provides colors for the values',
      }),
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
