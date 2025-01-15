/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { GridLayoutStateManager, PanelInteractionEvent, UserInteractionEvent } from '../../types';
import { useGridLayoutEvents } from '../../use_grid_layout_events';
import { DefaultDragHandle } from './default_drag_handle';

export interface DragHandleApi {
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
}

export const DragHandle = React.forwardRef<
  DragHandleApi,
  {
    gridLayoutStateManager: GridLayoutStateManager;
    interactionStart: (
      type: PanelInteractionEvent['type'] | 'drop',
      e: UserInteractionEvent
    ) => void;
  }
>(({ interactionStart, gridLayoutStateManager }, ref) => {
  const { addDragEventListeners, removeDragEventListeners, onDragStart } = useGridLayoutEvents({
    interactionStart,
    interactionType: 'drag',
    gridLayoutStateManager,
  });

  const [dragHandleCount, setDragHandleCount] = useState<number>(0);
  const dragHandleRefs = useRef<Array<HTMLElement | null>>([]);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      setDragHandleCount(dragHandles.length);
      dragHandleRefs.current = dragHandles;
      addDragEventListeners(dragHandles);
    },
    [addDragEventListeners]
  );

  useEffect(
    () => () => {
      // on unmount, remove all drag handle event listeners
      removeDragEventListeners(dragHandleRefs.current);
    },
    [removeDragEventListeners]
  );

  useImperativeHandle(ref, () => ({ setDragHandles }), [setDragHandles]);

  return Boolean(dragHandleCount) ? null : <DefaultDragHandle onDragStart={onDragStart} />;
});
