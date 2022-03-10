/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import chroma from 'chroma-js';
import { i18n } from '@kbn/i18n';

import { EventAnnotationService } from './types';
import { defaultAnnotationColor } from '..';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export function buildAnnotation(): EventAnnotationService {
  return {
    title: i18n.translate('charts.annotations.customLabel', { defaultMessage: 'Custom' }),
    toExpression: ({
      label,
      isHidden,
      id,
      color,
      lineStyle,
      lineWidth,
      icon,
      iconPosition,
      textVisibility,
      timestamp,
      annotationType,
      keyType,
      axisMode,
    }) => {
      return {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'annotation_config',
            arguments: {
              annotationType: [annotationType || 'manual'],
              key: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'annotation_key',
                      arguments: {
                        keyType: [keyType],
                        timestamp: [timestamp],
                      },
                    },
                  ],
                },
              ],
              label: [label],
              color: [color || defaultAnnotationColor],
              lineWidth: [lineWidth || 1],
              lineStyle: [lineStyle || 'solid'],
              id: [id],
              icon: hasIcon(icon) ? [icon] : ['empty'],
              iconPosition: hasIcon(icon) || textVisibility ? [iconPosition || 'auto'] : ['auto'],
              textVisibility: [textVisibility || false],
              isHidden: [Boolean(isHidden)],
              axisMode: [axisMode || 'bottom'],
            },
          },
        ],
      };
    },
  };
}
