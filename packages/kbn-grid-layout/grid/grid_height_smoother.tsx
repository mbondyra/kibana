/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { GridLayoutStateManager } from './types';

export const GridHeightSmoother = ({
  children,
  gridLayoutStateManager,
}: PropsWithChildren<{ gridLayoutStateManager: GridLayoutStateManager }>) => {
  // set the parent div size directly to smooth out height changes.
  const smoothHeightRef = useRef<HTMLDivElement | null>(null);
  // set up global CSS variables
  const [cssVariables, setCssVariables] = useState<string>('');

  useEffect(() => {
    const interactionStyleSubscription = combineLatest([
      gridLayoutStateManager.gridDimensions$,
      gridLayoutStateManager.interactionEvent$,
    ]).subscribe(([dimensions, interactionEvent]) => {
      if (!smoothHeightRef.current || gridLayoutStateManager.expandedPanelId$.getValue()) return;

      if (!interactionEvent) {
        smoothHeightRef.current.style.height = `${dimensions.height}px`;
        smoothHeightRef.current.style.userSelect = 'auto';
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
      smoothHeightRef.current.style.userSelect = 'none';
    });

    const expandedPanelSubscription = gridLayoutStateManager.expandedPanelId$.subscribe(
      (expandedPanelId) => {
        if (!smoothHeightRef.current) return;
        if (expandedPanelId) {
          smoothHeightRef.current.classList.add('kbnGridWrapper--hasExpandedPanel');
        } else {
          smoothHeightRef.current.classList.remove('kbnGridWrapper--hasExpandedPanel');
        }
      }
    );

    const defineCssVariablesSubscription = gridLayoutStateManager.runtimeSettings$
      .pipe(
        map(({ gutterSize }) => gutterSize),
        distinctUntilChanged()
      )
      .subscribe((gutterSize) => {
        setCssVariables(`--kbnGridGutterSize: ${gutterSize}px;`);
      });

    return () => {
      interactionStyleSubscription.unsubscribe();
      expandedPanelSubscription.unsubscribe();
      defineCssVariablesSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={smoothHeightRef}
      className={'kbnGridWrapper'}
      css={css`
        ${cssVariables}

        margin: var(--kbnGridGutterSize);
        overflow-anchor: none;
        transition: height 500ms linear;

        &.kbnGridWrapper--hasExpandedPanel {
          height: 100% !important;
          position: relative;
          transition: none;
          // switch to padding so that the panel does not extend the height of the parent
          margin: 0px;
          padding: var(--kbnGridGutterSize);
        }
      `}
    >
      {children}
    </div>
  );
};
