/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useRef } from 'react';
import { cloneDeep } from 'lodash';
import { resolveGridRow } from '../utils/resolve_grid_row';
import {
  GridPanelData,
  GridLayoutStateManager,
  PanelInteractionEvent,
  UserInteractionEvent,
} from '../types';
import { isGridDataEqual } from '../utils/equality_checks';
import { isMouseEvent, isTouchEvent, attachMouseEvents, attachTouchEvents } from './sensors';
import { handleAutoscroll, stopAutoScroll } from './autoscroll';
import {
  getDragPreviewRect,
  getResizePreviewRect,
  getPointerPosition,
  getPointerOffsets,
} from './pointer_event_utils';

export const useGridLayoutEvents = ({
  interactionType,
  gridLayoutStateManager,
  rowIndex,
  panelId,
}: {
  interactionType: PanelInteractionEvent['type'];

  gridLayoutStateManager: GridLayoutStateManager;
  rowIndex: number;
  panelId: string;
}) => {
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);
  const pointerClientPixel = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPointerMove = useCallback(
    (e: Event) => {
      const { runtimeSettings$, interactionEvent$, gridLayout$, activePanel$, rowRefs } =
        gridLayoutStateManager;
      const interactionEvent = interactionEvent$.value;
      if (!interactionEvent) {
        // if no interaction event return early
        return;
      }

      const gridRowElements = rowRefs.current;
      if (!runtimeSettings$.value || !gridRowElements) {
        return;
      }

      e.stopPropagation();
      // make sure when the user is dragging through touchmove, the page doesn't scroll
      if (isTouchEvent(e)) {
        e.preventDefault();
      }

      const currentLayout = gridLayout$.value;
      const currentGridData = (() => {
        for (const row of currentLayout) {
          if (row.panels[interactionEvent.id]) return row.panels[interactionEvent.id];
        }
      })();

      if (!currentGridData) {
        return;
      }

      if (isMouseEvent(e) || isTouchEvent(e)) {
        pointerClientPixel.current = getPointerPosition(e);
      }

      const currentRuntimeSettings = runtimeSettings$.value;

      const { columnCount, gutterSize, rowHeight, columnPixelWidth } = currentRuntimeSettings;

      const isResize = interactionEvent?.type === 'resize';

      const previewRect = isResize
        ? getResizePreviewRect(interactionEvent, pointerClientPixel.current, currentRuntimeSettings)
        : getDragPreviewRect(interactionEvent, pointerClientPixel.current);

      activePanel$.next({ id: interactionEvent.id, position: previewRect });

      // find the grid that the preview rect is over
      const lastRowIndex = interactionEvent?.targetRowIndex;
      const targetRowIndex = (() => {
        if (isResize) return lastRowIndex;
        const previewBottom = previewRect.top + runtimeSettings$.value.rowHeight;

        let highestOverlap = -Infinity;
        let highestOverlapRowIndex = -1;
        gridRowElements.forEach((row, index) => {
          if (!row) return;
          const rowRect = row.getBoundingClientRect();
          const overlap =
            Math.min(previewBottom, rowRect.bottom) - Math.max(previewRect.top, rowRect.top);
          if (overlap > highestOverlap) {
            highestOverlap = overlap;
            highestOverlapRowIndex = index;
          }
        });
        return highestOverlapRowIndex;
      })();
      const hasChangedGridRow = targetRowIndex !== lastRowIndex;

      // re-render when the target row changes
      if (hasChangedGridRow) {
        interactionEvent$.next({
          ...interactionEvent,
          targetRowIndex,
        });
      }

      // calculate the requested grid position
      const targetedGridRow = gridRowElements[targetRowIndex];
      const targetedGridLeft = targetedGridRow?.getBoundingClientRect().left ?? 0;
      const targetedGridTop = targetedGridRow?.getBoundingClientRect().top ?? 0;

      const maxColumn = isResize ? columnCount : columnCount - currentGridData.width;

      const localXCoordinate = isResize
        ? previewRect.right - targetedGridLeft
        : previewRect.left - targetedGridLeft;
      const localYCoordinate = isResize
        ? previewRect.bottom - targetedGridTop
        : previewRect.top - targetedGridTop;

      const targetColumn = Math.min(
        Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
        maxColumn
      );
      const targetRow = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);

      const requestedGridData = { ...currentGridData };
      if (isResize) {
        requestedGridData.width = Math.max(targetColumn - requestedGridData.column, 1);
        requestedGridData.height = Math.max(targetRow - requestedGridData.row, 1);
      } else {
        requestedGridData.column = targetColumn;
        requestedGridData.row = targetRow;
      }

      // resolve the new grid layout
      if (
        hasChangedGridRow ||
        !isGridDataEqual(requestedGridData, lastRequestedPanelPosition.current)
      ) {
        lastRequestedPanelPosition.current = { ...requestedGridData };

        // remove the panel from the row it's currently in.
        const nextLayout = currentLayout.map((row) => {
          const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
          return { ...row, panels: { ...otherPanels } };
        });

        // resolve destination grid
        const destinationGrid = nextLayout[targetRowIndex];
        const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedGridData);
        nextLayout[targetRowIndex] = resolvedDestinationGrid;

        // resolve origin grid
        if (hasChangedGridRow) {
          const originGrid = nextLayout[lastRowIndex];
          const resolvedOriginGrid = resolveGridRow(originGrid);
          nextLayout[lastRowIndex] = resolvedOriginGrid;
        }
        if (!deepEqual(currentLayout, nextLayout)) {
          gridLayout$.next(nextLayout);
        }
      }
    },
    [gridLayoutStateManager]
  );

  const attachLayoutEvents = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;
      e.stopPropagation();

      if (isMouseEvent(e)) {
        attachMouseEvents(
          e,
          (ev) => {
            onPointerMove(ev);
            handleAutoscroll(scrollInterval, pointerClientPixel.current.y);
          },
          () => {
            stopAutoScroll(scrollInterval);
            finishInteraction(gridLayoutStateManager);
          }
        );
      } else if (isTouchEvent(e)) {
        attachTouchEvents(e, onPointerMove, () => {
          finishInteraction(gridLayoutStateManager);
        });
      }

      startInteraction(gridLayoutStateManager, e, interactionType, rowIndex, panelId);
    },
    [gridLayoutStateManager, onPointerMove, rowIndex, panelId, interactionType]
  );

  return attachLayoutEvents;
};

const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};

const finishInteraction = ({
  activePanel$,
  interactionEvent$,
  stableGridLayout$,
  gridLayout$,
}: GridLayoutStateManager) => {
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);
  if (!deepEqual(gridLayout$.getValue(), stableGridLayout$.getValue())) {
    stableGridLayout$.next(cloneDeep(gridLayout$.getValue()));
  }
};

const startInteraction = (
  gridLayoutStateManager: GridLayoutStateManager,
  e: UserInteractionEvent,
  type: 'drag' | 'resize',
  rowIndex: number,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
  if (!panelRef) return;

  const panelRect = panelRef.getBoundingClientRect();
  const pointerOffsets = getPointerOffsets(e, panelRect);

  gridLayoutStateManager.interactionEvent$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetRowIndex: rowIndex,
    pointerOffsets,
  });
};
