/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { GridLayoutStateManager } from '../../../types';
import { resolveGridRow } from '../../../utils/resolve_grid_row';
import { dragKeyboardCoordinateGetter, resizeKeyboardCoordinateGetter } from './utils';
import { KeyboardCode, KeyboardCodes, UserKeyboardEvent } from './types';

export const isKeyboardEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserKeyboardEvent => {
  return 'key' in e;
};

const keyboardCodes: KeyboardCodes = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc, KeyboardCode.Tab],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
  move: [KeyboardCode.Right, KeyboardCode.Left, KeyboardCode.Down, KeyboardCode.Up],
};

const onMove = (e: UserKeyboardEvent, gridLayoutStateManager: GridLayoutStateManager) => {
  const {
    runtimeSettings$,
    interactionEvent$: { value: interactionEvent },
    gridLayout$,
    activePanel$,
    rowRefs,
  } = gridLayoutStateManager;

  if (!interactionEvent) {
    // if no interaction event return early
    return;
  }

  const gridRowElements = rowRefs.current;
  if (!runtimeSettings$.value || !gridRowElements) {
    return;
  }

  e.stopPropagation();

  const currentLayout = gridLayout$.value;
  const currentGridData = (() => {
    for (const row of currentLayout) {
      if (row.panels[interactionEvent.id]) return row.panels[interactionEvent.id];
    }
  })();

  if (!currentGridData) {
    return;
  }

  const runtimeSettings = runtimeSettings$.value;

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  const isResize = interactionEvent?.type === 'resize';

  // todo start
  let previewRect: { top: number; bottom: number; left: number; right: number } | undefined;

  // find the grid that the preview rect is over
  if (isKeyboardEvent(e)) {
    const rowIndex = interactionEvent.targetRowIndex;
    if (rowIndex === undefined) return;
    const panelId = interactionEvent.id;

    const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
    if (!panelRef) return;

    const { top, bottom, left, right } = panelRef.getBoundingClientRect();

    previewRect = isResize
      ? resizeKeyboardCoordinateGetter(e.code, {
          currentCoordinates: { top, bottom, left, right },
          runtimeSettings,
        })
      : dragKeyboardCoordinateGetter(e.code, {
          currentCoordinates: { top, bottom, left, right },
          runtimeSettings,
        });
  }

  if (previewRect === undefined) {
    return;
  }

  // todo end
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
    gridLayoutStateManager.interactionEvent$.next({
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
};

export const onKeyDown = ({
  e,
  gridLayoutStateManager,
  onStart,
  onEnd,
  onCancel,
  onBlur,
}: {
  e: UserKeyboardEvent;
  gridLayoutStateManager: GridLayoutStateManager;
  onStart: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onBlur: () => void;
}) => {
  const pressedKey = e.code;
  const {
    interactionEvent$: { value: interactionEvent },
  } = gridLayoutStateManager;
  if (!interactionEvent) {
    if (keyboardCodes.start.includes(pressedKey)) {
      e.stopPropagation();
      // in case of interupted interaction (eg using a mouse), cancel the interaction
      e.target!.addEventListener('blur', onBlur, { once: true });

      //   document.addEventListener('scroll', () => onMove(e, gridLayoutStateManager));
      onStart();
    }
    // if user pressed anything else, ignore the event
    return;
  }
  // avoiding scroll
  e.stopPropagation();

  if (keyboardCodes.end.includes(pressedKey)) {
    // document.removeEventListener('scroll', () => onMove(e, gridLayoutStateManager));
    return onEnd();
  }

  e.preventDefault(); // this has to be here so tabbing works correctly

  if (keyboardCodes.cancel.includes(pressedKey)) {
    return onCancel();
  }

  // if the user pressed a move key, move the interaction event
  if (keyboardCodes.move.includes(pressedKey)) {
    onMove(e, gridLayoutStateManager);
  }
};
