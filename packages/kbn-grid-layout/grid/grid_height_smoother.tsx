/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { combineLatest } from 'rxjs';
import { euiThemeVars } from '@kbn/ui-theme';
import { GridLayoutStateManager } from './types';

const getViewportHeight = () =>
  window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

export const GridHeightSmoother = ({
  children,
  gridLayoutStateManager,
}: PropsWithChildren<{ gridLayoutStateManager: GridLayoutStateManager }>) => {
  // set the parent div size directly to smooth out height changes.
  const smoothHeightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const subscription = combineLatest([
      gridLayoutStateManager.gridDimensions$,
      gridLayoutStateManager.interactionEvent$,
      gridLayoutStateManager.expandedPanelId$,
    ]).subscribe(([dimensions, interactionEvent, expandedPanelId]) => {
      if (!smoothHeightRef.current) return;

      if (expandedPanelId) {
        const viewPortHeight = getViewportHeight();
        const smoothHeightRefY = smoothHeightRef.current.getBoundingClientRect().y;

        // When panel is expanded, ensure the page occupies the full viewport height, no more, no less, so
        // smoothHeight height = viewport height - smoothHeight position - EuiPanel padding.

        const height = viewPortHeight - smoothHeightRefY - parseFloat(euiThemeVars.euiSizeL);
        smoothHeightRef.current.style.height = height + 'px';
        smoothHeightRef.current.style.transition = 'none';
        return;
      } else {
        smoothHeightRef.current.style.transition = '';
      }

      if (!interactionEvent) {
        smoothHeightRef.current.style.height = `${dimensions.height}px`;
        return;
      }

      /**
       * When the user is interacting with an element, the page can grow, but it cannot
       * shrink. This is to stop a behaviour where the page would scroll up automatically
       * making the panel shrink or grow unpredictably.
       */
      smoothHeightRef.current.style.height = `${Math.max(
        dimensions.height ?? 0,
        smoothHeightRef.current.getBoundingClientRect().height
      )}px`;
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={smoothHeightRef}
      css={css`
        overflow-anchor: none;
        transition: height 500ms linear;
      `}
    >
      {children}
    </div>
  );
};
