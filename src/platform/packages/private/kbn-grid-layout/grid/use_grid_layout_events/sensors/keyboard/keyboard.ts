/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { GridLayoutStateManager } from '../../../types';
import { resolveGridRow } from '../../../utils/resolve_grid_row';
import { dragKeyboardCoordinateGetter, resizeKeyboardCoordinateGetter } from './utils';
import { KeyboardCode, KeyboardCodes, UserKeyboardEvent } from './types';
import { getResizePreviewRect } from '../../pointer_event_utils';

export const isKeyboardEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserKeyboardEvent => {
  return 'key' in e;
};

const keyboardCodes: KeyboardCodes = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc, KeyboardCode.Tab],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
  move: [KeyboardCode.Right, KeyboardCode.Left, KeyboardCode.Down, KeyboardCode.Up],
};

export const onKeyDown = ({
  e,
  gridLayoutStateManager,
  onStart,
  onEnd,
  onCancel,
}: {
  e: UserKeyboardEvent;
  gridLayoutStateManager: GridLayoutStateManager;
  onStart: () => void;
  onEnd: () => void;
  onCancel: () => void;
}) => {
  const pressedKey = e.code;
  const {
    interactionEvent$: { value: interactionEvent },
  } = gridLayoutStateManager;
  if (!interactionEvent) {
    if (keyboardCodes.start.includes(pressedKey)) {
      e.stopPropagation();
      onStart();
      // in case of interupted interaction (eg using a mouse), cancel the interaction
      e.target!.addEventListener('blur', onCancel, { once: true });
      onStart();
    }
    // if user pressed anything else, ignore the event
    return;
  }

  e.stopPropagation();
  e.preventDefault();
  if (keyboardCodes.end.includes(pressedKey)) {
    return onEnd();
  }

  if (keyboardCodes.cancel.includes(pressedKey)) {
    return onCancel();
  }

  // if the user pressed a move key, move the interaction event
  if (keyboardCodes.move.includes(pressedKey)) {
    // / todo

    const { runtimeSettings$, gridLayout$, activePanel$, rowRefs } = gridLayoutStateManager;

    const gridRowElements = rowRefs.current;
    if (!runtimeSettings$.value || !gridRowElements) {
      return;
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

    const runtimeSettings = runtimeSettings$.value;

    const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

    const isResize = interactionEvent.type === 'resize';
    // find the grid that the preview rect is over
    const rowIndex = interactionEvent.targetRowIndex;
    if (rowIndex === undefined) return;
    const panelId = interactionEvent.id;

    const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
    if (!panelRef) return;

    const { top, bottom, left, right } = panelRef.getBoundingClientRect();

    const previewRect = resizeKeyboardCoordinateGetter(pressedKey, {
      currentCoordinates: { top, bottom, left, right },
      runtimeSettings,
    });

    if (!previewRect) throw new Error('Invalid preview rect');

    activePanel$.next({ id: interactionEvent.id, position: previewRect });

    // calculate the requested grid position
    const targetedGridRow = gridRowElements[rowIndex];
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
    }
    // resolve the new grid layout

    // remove the panel from the row it's currently in.
    const nextLayout = currentLayout.map((row) => {
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      return { ...row, panels: { ...otherPanels } };
    });

    // resolve destination grid
    const destinationGrid = nextLayout[rowIndex];
    const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedGridData);
    nextLayout[rowIndex] = resolvedDestinationGrid;

    if (!deepEqual(currentLayout, nextLayout)) {
      gridLayout$.next(nextLayout);
    }

    // /todo
  }
};
