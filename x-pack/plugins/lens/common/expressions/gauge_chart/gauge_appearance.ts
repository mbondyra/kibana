/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';

export const GAUGE_APPEARANCE_FUNCTION = 'lens_gauge_appearance';

export type GaugeTitleMode = 'auto' | 'custom' | 'none';
export interface GaugeAppearanceConfig {
  ticksPosition: 'auto' | 'bands' | 'none';
  titleMode: GaugeTitleMode;
  title?: string;
  subtitle?: string;
}

export type GaugeAppearanceResult = GaugeAppearanceConfig & {
  type: typeof GAUGE_APPEARANCE_FUNCTION;
};

export const gaugeAppearanceConfig: ExpressionFunctionDefinition<
  typeof GAUGE_APPEARANCE_FUNCTION,
  null,
  GaugeAppearanceConfig,
  GaugeAppearanceResult
> = {
  name: GAUGE_APPEARANCE_FUNCTION,
  aliases: [],
  type: GAUGE_APPEARANCE_FUNCTION,
  help: `Configure the gauge layout`,
  inputTypes: ['null'],
  args: {
    ticksPosition: {
      types: ['string'],
      options: ['none', 'auto', 'bands'],
      help: i18n.translate('xpack.lens.gaugeChart.config.ticksPosition.help', {
        defaultMessage: 'Specifies the placement of ticks',
      }),
      required: true,
    },
    titleMode: {
      types: ['string'],
      options: ['none', 'auto', 'custom'],
      help: i18n.translate('xpack.lens.gaugeChart.config.titleMode.help', {
        defaultMessage: 'Specifies the mode of title',
      }),
      required: true,
    },
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gaugeChart.config.title.help', {
        defaultMessage: 'Specifies the title of the gauge chart.',
      }),
      required: false,
    },
    subtitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gaugeChart.config.subtitle.help', {
        defaultMessage: 'Specifies the Subtitle of the gauge chart',
      }),
      required: false,
    },
  },
  fn(input, args) {
    return {
      type: GAUGE_APPEARANCE_FUNCTION,
      ...args,
    };
  },
};
