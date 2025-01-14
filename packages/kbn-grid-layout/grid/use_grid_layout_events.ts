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
import { resolveGridRow } from './utils/resolve_grid_row';
import {
  GridPanelData,
  GridLayoutStateManager,
  PanelInteractionEvent,
  UserInteractionEvent,
  UserMouseEvent,
  UserTouchEvent,
} from './types';
import { isGridDataEqual } from './utils/equality_checks';
import { isMouseEvent, isTouchEvent } from './utils/sensors';

const MIN_SPEED = 50;
const MAX_SPEED = 150;

const scrollOnInterval = (direction: 'up' | 'down') => {
  let count = 0;
  let currentSpeed = MIN_SPEED;
  let maxSpeed = MIN_SPEED;
  let turnAroundPoint: number | undefined;

  const interval = setInterval(() => {
    /**
     * Since "smooth" scrolling on an interval is jittery on Chrome, we are manually creating
     * an "ease" effect via the parabola formula `y = a(x - h)^2 + k`
     *
     * Scrolling slowly speeds up as the user drags, and it slows down again as they approach the
     * top and/or bottom of the screen.
     */
    const nearTop = direction === 'up' && scrollY < window.innerHeight;
    const nearBottom =
      direction === 'down' &&
      window.innerHeight + window.scrollY > document.body.scrollHeight - window.innerHeight;
    if (!turnAroundPoint && (nearTop || nearBottom)) {
      // reverse the direction of the parabola
      maxSpeed = currentSpeed;
      turnAroundPoint = count;
    }

    currentSpeed = turnAroundPoint
      ? Math.max(-3 * (count - turnAroundPoint) ** 2 + maxSpeed, MIN_SPEED) // slow down fast
      : Math.min(0.1 * count ** 2 + MIN_SPEED, MAX_SPEED); // speed up slowly
    window.scrollBy({
      top: direction === 'down' ? currentSpeed : -currentSpeed,
    });

    count++; // increase the counter to increase the time interval used in the parabola formula
  }, 60);
  return interval;
};

const stopAutoScroll = (scrollInterval?: React.MutableRefObject<NodeJS.Timeout | null>) => {
  if (scrollInterval?.current) {
    clearInterval(scrollInterval.current);
    scrollInterval.current = null;
  }
};

const usePointerMoveHandler = ({
  gridLayoutStateManager,
  scrollInterval,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
  scrollInterval: React.MutableRefObject<NodeJS.Timeout | null>;
}) => {
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  // -----------------------------------------------------------------------------------------
  // Set up drag events
  // -----------------------------------------------------------------------------------------
  const pointerMoveHandler = useCallback(
    (e: Event) => {
      const { runtimeSettings$, interactionEvent$, gridLayout$ } = gridLayoutStateManager;
      const interactionEvent = interactionEvent$.value;
      if (!interactionEvent) {
        // if no interaction event, stop auto scroll (if necessary) and return early
        stopAutoScroll(scrollInterval);
        return;
      }

      e.stopPropagation();
      // make sure when the user is dragging through touchmove, the page doesn't scroll
      if (isTouchEvent(e)) {
        e.preventDefault();
      }

      const gridRowElements = gridLayoutStateManager.rowRefs.current;

      const isResize = interactionEvent?.type === 'resize';

      const currentLayout = gridLayout$.value;
      const currentGridData = (() => {
        if (!interactionEvent) return;
        for (const row of currentLayout) {
          if (row.panels[interactionEvent.id]) return row.panels[interactionEvent.id];
        }
      })();

      if (!runtimeSettings$.value || !gridRowElements || !currentGridData) {
        return;
      }

      const pointerClientPixel = getPointerClientPosition(e);
      const panelRect = interactionEvent.panelDiv.getBoundingClientRect();

      const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings$.value;
      const gridWidth = (gutterSize + columnPixelWidth) * columnCount + gutterSize * 2;

      const previewRect = {
        left: isResize
          ? panelRect.left
          : pointerClientPixel.x - interactionEvent.pointerOffsets.left,
        top: isResize ? panelRect.top : pointerClientPixel.y - interactionEvent.pointerOffsets.top,
        bottom: pointerClientPixel.y - interactionEvent.pointerOffsets.bottom,
        right:
          isResize && isTouchEvent(e)
            ? Math.min(pointerClientPixel.x - interactionEvent.pointerOffsets.right, gridWidth)
            : pointerClientPixel.x - interactionEvent.pointerOffsets.right,
      };

      gridLayoutStateManager.activePanel$.next({ id: interactionEvent.id, position: previewRect });

      // find the grid that the preview rect is over
      const previewBottom =
        previewRect.top + gridLayoutStateManager.runtimeSettings$.value.rowHeight;
      const lastRowIndex = interactionEvent?.targetRowIndex;
      const targetRowIndex = (() => {
        if (isResize) return lastRowIndex;

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

      if (!isTouchEvent(e)) {
        // auto scroll when an event is happening close to the top or bottom of the screen
        const heightPercentage =
          100 - ((window.innerHeight - pointerClientPixel.y) / window.innerHeight) * 100;
        const atTheTop = window.scrollY <= 0;
        const atTheBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight;

        const startScrollingUp = heightPercentage < 5 && !atTheTop; // don't scroll up when resizing
        const startScrollingDown = heightPercentage > 95 && !atTheBottom;
        if (startScrollingUp || startScrollingDown) {
          if (!scrollInterval.current) {
            // only start scrolling if it's not already happening
            scrollInterval.current = scrollOnInterval(startScrollingUp ? 'up' : 'down');
          }
        } else {
          stopAutoScroll(scrollInterval);
        }
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

  return pointerMoveHandler;
};

function getPointerClientPosition(e: Event) {
  if (isMouseEvent(e)) {
    return { x: e.clientX, y: e.clientY };
  }
  if (isTouchEvent(e)) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  throw new Error('Unknown event type');
}

const MOUSE_BUTTON_LEFT = 0;

export const useGridLayoutEvents = ({
  interactionType,
  interactionStart,
  gridLayoutStateManager,
}: {
  interactionType: PanelInteractionEvent['type'];
  interactionStart: (type: PanelInteractionEvent['type'] | 'drop', e: UserInteractionEvent) => void;
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);
  const pointerMoveHandler = usePointerMoveHandler({ gridLayoutStateManager, scrollInterval });

  const initializeMouseEvents = useCallback(
    (e: UserMouseEvent) => {
      if (e.button !== MOUSE_BUTTON_LEFT) return;

      const onDragEnd = () => {
        interactionStart('drop', e);
        document.removeEventListener('scroll', pointerMoveHandler);
        document.removeEventListener('mousemove', pointerMoveHandler);
        stopAutoScroll(scrollInterval);
      };

      document.addEventListener('scroll', pointerMoveHandler);
      document.addEventListener('mousemove', pointerMoveHandler);
      document.addEventListener('mouseup', onDragEnd, { once: true });

      interactionStart(interactionType, e);
    },
    [pointerMoveHandler, interactionType, interactionStart]
  );

  const initializeTouchEvents = useCallback(
    (e: UserTouchEvent) => {
      if (e.touches.length > 1) return;

      const onDragEnd = () => {
        interactionStart('drop', e);
        e.target!.removeEventListener('touchmove', pointerMoveHandler);
      };

      e.target!.addEventListener('touchmove', pointerMoveHandler);
      e.target!.addEventListener('touchend', onDragEnd, { once: true });

      interactionStart(interactionType, e);
    },
    [pointerMoveHandler, interactionType, interactionStart]
  );

  const onDragStart = useCallback(
    (e: UserMouseEvent | UserTouchEvent) => {
      const isInteractive =
        gridLayoutStateManager.expandedPanelId$.value === undefined &&
        gridLayoutStateManager.accessMode$.getValue() === 'EDIT';
      if (!isInteractive) return;

      if (isMouseEvent(e)) {
        initializeMouseEvents(e);
      } else if (isTouchEvent(e)) {
        initializeTouchEvents(e);
      }
    },
    [initializeMouseEvents, initializeTouchEvents, gridLayoutStateManager]
  );
  return onDragStart;
};
