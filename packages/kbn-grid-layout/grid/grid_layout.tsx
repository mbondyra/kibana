/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest, distinctUntilChanged, filter, map, pairwise, skip } from 'rxjs';

import { css } from '@emotion/react';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridRow } from './grid_row';
import { GridAccessMode, GridLayoutData, GridSettings } from './types';
import { useGridLayoutEvents } from './use_grid_layout_events';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';
import { resolveGridRow } from './utils/resolve_grid_row';

export interface GridLayoutProps {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  renderPanelContents: (
    panelId: string,
    setDragHandles?: (refs: Array<HTMLElement | null>) => void
  ) => React.ReactNode;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
}

export const GridLayout = ({
  layout,
  gridSettings,
  renderPanelContents,
  onLayoutChange,
  expandedPanelId,
  accessMode = 'EDIT',
}: GridLayoutProps) => {
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    layout,
    gridSettings,
    expandedPanelId,
    accessMode,
  });
  useGridLayoutEvents({ gridLayoutStateManager });
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const [rowCount, setRowCount] = useState<number>(
    gridLayoutStateManager.gridLayout$.getValue().length
  );

  /**
   * Update the `gridLayout$` behaviour subject in response to the `layout` prop changing
   */
  useEffect(() => {
    if (!isLayoutEqual(layout, gridLayoutStateManager.gridLayout$.getValue())) {
      const newLayout = cloneDeep(layout);
      /**
       * the layout sent in as a prop is not guaranteed to be valid (i.e it may have floating panels) -
       * so, we need to loop through each row and ensure it is compacted
       */
      newLayout.forEach((row, rowIndex) => {
        newLayout[rowIndex] = resolveGridRow(row);
      });
      gridLayoutStateManager.gridLayout$.next(newLayout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  /**
   * Set up subscriptions
   */
  useEffect(() => {
    /**
     * The only thing that should cause the entire layout to re-render is adding a new row;
     * this subscription ensures this by updating the `rowCount` state when it changes.
     */
    const rowCountSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        skip(1), // we initialized `rowCount` above, so skip the initial emit
        map((newLayout) => newLayout.length),
        distinctUntilChanged()
      )
      .subscribe((newRowCount) => {
        setRowCount(newRowCount);
      });

    /**
     * This subscription calls the passed `onLayoutChange` callback when the layout changes
     */
    const onLayoutChangeSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.interactionEvent$,
    ])
      .pipe(
        // if an interaction event is happening, then ignore any "draft" layout changes
        filter(([_, event]) => !Boolean(event)),
        // once no interaction event, create pairs of "old" and "new" layouts for comparison
        map(([newLayout]) => newLayout),
        pairwise()
      )
      .subscribe(([layoutBefore, layoutAfter]) => {
        if (!isLayoutEqual(layoutBefore, layoutAfter)) {
          onLayoutChange(layoutAfter);
        }
      });

    /**
     * This subscription adds and/or removes the necessary class names related to styling for
     * expanded panels, mobile view, and a static (non-interactable) grid layout
     */
    const gridLayoutClassSubscription = combineLatest([
      gridLayoutStateManager.expandedPanelId$,
      gridLayoutStateManager.accessMode$,
      gridLayoutStateManager.isMobileView$,
    ]).subscribe(([currentExpandedPanelId, currentAccessMode, isMobileView]) => {
      if (!layoutRef) return;

      if (isMobileView) {
        layoutRef.current?.classList.add('kbnGrid--mobileView');
      } else {
        layoutRef.current?.classList.remove('kbnGrid--mobileView');
      }

      if (currentExpandedPanelId) {
        layoutRef.current?.classList.add('kbnGrid--static');
        layoutRef.current?.classList.add('kbnGrid--hasExpandedPanel');
      } else if (currentAccessMode === 'VIEW') {
        layoutRef.current?.classList.add('kbnGrid--static');
        layoutRef.current?.classList.remove('kbnGrid--hasExpandedPanel');
      } else {
        layoutRef.current?.classList.remove('kbnGrid--static');
        layoutRef.current?.classList.remove('kbnGrid--hasExpandedPanel');
      }
    });

    return () => {
      rowCountSubscription.unsubscribe();
      onLayoutChangeSubscription.unsubscribe();
      gridLayoutClassSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Memoize row children components to prevent unnecessary re-renders
   */
  const children = useMemo(() => {
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      return (
        <GridRow
          key={rowIndex}
          rowIndex={rowIndex}
          renderPanelContents={renderPanelContents}
          gridLayoutStateManager={gridLayoutStateManager}
          setInteractionEvent={(nextInteractionEvent) => {
            if (!nextInteractionEvent) {
              gridLayoutStateManager.activePanel$.next(undefined);
            }
            gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
          }}
          ref={(element: HTMLDivElement | null) =>
            (gridLayoutStateManager.rowRefs.current[rowIndex] = element)
          }
        />
      );
    });
  }, [rowCount, gridLayoutStateManager, renderPanelContents]);

  return (
    <GridHeightSmoother gridLayoutStateManager={gridLayoutStateManager}>
      <div
        ref={(divElement) => {
          layoutRef.current = divElement;
          setDimensionsRef(divElement);
        }}
        className="kbnGrid"
        css={css`
          &.kbnGrid--hasExpandedPanel {
            ${expandedPanelStyles}
          }
          &.kbnGrid--mobileView {
            ${singleColumnStyles}
          }
        `}
      >
        {children}
      </div>
    </GridHeightSmoother>
  );
};

const singleColumnStyles = css`
  .kbnGridRow {
    grid-template-columns: 100%;
    grid-template-rows: auto;
    grid-auto-flow: row;
    grid-auto-rows: auto;
  }

  .kbnGridPanel {
    grid-area: unset !important;
  }
`;

const expandedPanelStyles = css`
  height: 100%;

  .kbnGridRowContainer {
    &:not(.kbnGridRowContainer--hasExpandedPanel) {
      // hide the rows that do not contain the expanded panel
      position: absolute;
      top: -9999px;
      left: -9999px;
    }
    &--hasExpandedPanel {
      .kbnGridRowHeader {
        height: 0px; // used instead of 'display: none' due to a11y concerns
      }

      .kbnGridRow {
        display: block !important; // overwrite grid display
        height: 100%;

        .kbnGridPanel {
          &:not(.kbnGridPanel--isExpanded) {
            // hide the non-expanded panels
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden; // remove hidden panels and their contents from tab order for a11y
          }
          &--isExpanded {
            // show only the expanded panel and make it take up the full height
            height: 100% !important;
          }
        }
      }
    }
  }
`;
