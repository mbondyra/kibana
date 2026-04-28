/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const visualizationWrapperStyles =
  (height: number) =>
  ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      height,
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      '&:hover > .visualization-button-actions, &:focus-within > .visualization-button-actions': {
        opacity: 1,
        pointerEvents: 'auto',
      },
      '.echChart ul': {
        marginInlineStart: 0,
      },

      '.expExpressionRenderer__expression': {
        padding: `${euiTheme.size.s} 0`,
      },
    });

export const visualizationEmbeddableStyles = css({
  flex: '1 1 auto',
  minHeight: 0,
});

export const actionsContainerStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    position: 'absolute',
    top: `-${euiTheme.size.xs}`,
    right: 0,
    zIndex: 2,
    opacity: 0,
    pointerEvents: 'none',
    transition: `opacity ${euiTheme.animation.fast} ease-in-out`,
    display: 'inline-flex',
    gap: 0,
  });
