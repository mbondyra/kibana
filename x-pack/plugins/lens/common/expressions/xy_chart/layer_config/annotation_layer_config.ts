/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnnotationConfig } from '../../../../../../../src/plugins/event_annotation/common';
import type { ExpressionFunctionDefinition } from '../../../../../../../src/plugins/expressions/common';
import { layerTypes } from '../../../constants';

export interface XYAnnotationLayerConfig {
  layerId: string;
  layerType: typeof layerTypes.ANNOTATIONS;
  accessors: string[];
  config: AnnotationConfig[];
}

export type AnnotationLayerConfigResult = XYAnnotationLayerConfig & {
  type: 'lens_xy_annotation_layer';
};

export const annotationLayerConfig: ExpressionFunctionDefinition<
  'lens_xy_annotation_layer',
  null,
  XYAnnotationLayerConfig,
  AnnotationLayerConfigResult
> = {
  name: 'lens_xy_annotation_layer',
  aliases: [],
  type: 'lens_xy_annotation_layer',
  help: `Configure a layer in the xy chart`,
  inputTypes: ['null'],
  args: {
    layerId: {
      types: ['string'],
      help: '',
    },
    layerType: { types: ['string'], options: [layerTypes.ANNOTATIONS], help: '' },
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
    config: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      types: ['annotation_config' as any],
      help: 'Additional configuration for y axes',
      multi: true,
    },
  },
  fn: function fn(input: unknown, args: XYAnnotationLayerConfig) {
    return {
      type: 'lens_xy_annotation_layer',
      ...args,
    };
  },
};
