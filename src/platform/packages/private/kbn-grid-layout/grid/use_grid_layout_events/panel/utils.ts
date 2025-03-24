/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { GridLayoutStateManager, PanelInteractionEvent } from '../../types';
import type { UserInteractionEvent, PointerPosition } from '../types';
import { KeyboardCode, type UserKeyboardEvent } from '../sensors/keyboard/types';
import { getSensorPosition, isKeyboardEvent, isMouseEvent, isTouchEvent } from '../sensors';

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  interactionEvent,
  pointerPixel,
  maxRight,
}: {
  pointerPixel: PointerPosition;
  interactionEvent: PanelInteractionEvent;
  maxRight: number;
}) => {
  const panelRect = interactionEvent.panelDiv.getBoundingClientRect();

  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerPixel.clientY - interactionEvent.sensorOffsets.bottom,
    right: Math.min(pointerPixel.clientX - interactionEvent.sensorOffsets.right, maxRight),
  };
};

// Calculates the preview rect coordinates for a dragged panel
export const getDragPreviewRect = ({
  pointerPixel,
  interactionEvent,
}: {
  pointerPixel: PointerPosition;
  interactionEvent: PanelInteractionEvent;
}) => {
  return {
    left: pointerPixel.clientX - interactionEvent.sensorOffsets.left,
    top: pointerPixel.clientY - interactionEvent.sensorOffsets.top,
    bottom: pointerPixel.clientY - interactionEvent.sensorOffsets.bottom,
    right: pointerPixel.clientX - interactionEvent.sensorOffsets.right,
  };
};

// Calculates the sensor's offset relative to the active panel's edges (top, left, right, bottom).
// This ensures the dragged or resized panel maintains its position under the cursor during the interaction.
export function getSensorOffsets(e: UserInteractionEvent, { top, left, right, bottom }: DOMRect) {
  if (!isTouchEvent(e) && !isMouseEvent(e) && !isKeyboardEvent(e)) {
    throw new Error('Unsupported event type: only mouse, touch, or keyboard events are handled.');
  }
  const { clientX, clientY } = getSensorPosition(e);
  return {
    top: clientY - top,
    left: clientX - left,
    right: clientX - right,
    bottom: clientY - bottom,
  };
}

export const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};

const OFFSET_BOTTOM = 8; // Aesthetic bottom margin

const updateClientY = (currentY: number, stepY: number, isCloseToEdge: boolean, type = 'drag') => {
  if (isCloseToEdge && type === 'resize') {
    setTimeout(() => document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }
  if (isCloseToEdge && type === 'drag') {
    window.scrollTo({ top: window.scrollY + stepY, behavior: 'smooth' });
    return currentY;
  }
  return currentY + stepY;
};

export const getNextPositionForPanel = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  handlePosition: { clientX: number; clientY: number }
) => {
  const {
    interactionEvent$: { value: interactionEvent },
    activePanel$: { value: activePanel },
    runtimeSettings$: {
      value: { columnPixelWidth, rowHeight, gutterSize, dragTopOffset },
    },
  } = gridLayoutStateManager;

  const { type } = interactionEvent || {};
  const panelPosition = activePanel?.position || interactionEvent?.panelDiv.getBoundingClientRect();

  if (!panelPosition) return handlePosition;

  const stepX = columnPixelWidth + gutterSize;
  const stepY = rowHeight + gutterSize;
  const gridPosition = gridLayoutStateManager.layoutRef.current?.getBoundingClientRect();

  switch (ev.code) {
    case KeyboardCode.Right: {
      // The distance between the handle and the right edge of the panel to ensure the panel stays within the screen boundaries
      const panelEdgeBuffer = panelPosition.right - handlePosition.clientX;

      return {
        ...handlePosition,
        clientX: Math.min(
          handlePosition.clientX + stepX,
          (gridPosition?.right || window.innerWidth) - panelEdgeBuffer
        ),
      };
    }
    case KeyboardCode.Left:
      return {
        ...handlePosition,
        clientX: Math.max(gridPosition?.left || 0, handlePosition.clientX - stepX),
      };

    case KeyboardCode.Down: {
      // check if next key will cross the bottom edge
      const isCloseToBottom = panelPosition.bottom + stepY + OFFSET_BOTTOM > window.innerHeight;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, stepY, isCloseToBottom, type),
      };
    }
    case KeyboardCode.Up: {
      // check if next key will cross the top edge
      const isCloseToTop = panelPosition.top - stepY - dragTopOffset < 0;
      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, -stepY, isCloseToTop, type),
      };
    }
    default:
      return handlePosition;
  }
};
