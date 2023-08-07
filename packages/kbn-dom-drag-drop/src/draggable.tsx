/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useCallback, useEffect, memo, useMemo } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import {
  DragDropIdentifier,
  DropIdentifier,
  nextValidDropTarget,
  ReorderContext,
  RegisteredDropTargets,
  DragDropAction,
  useDragDropContext,
} from './providers';
import './sass/drag_drop.scss';
import { REORDER_ITEM_MARGIN } from './constants';

/**
 * Droppable event
 */
export type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * The base props to the DragDrop component.
 */
interface BaseProps {
  /**
   * The CSS class(es) for the root element.
   */
  className?: string;
  /**
   * The event handler that fires when this element is picked.
   */
  onDragStart?: (
    target?: DroppableEvent['currentTarget'] | KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => void;
  /**
   * The event handler that fires when the dragging of this element ends.
   */
  onDragEnd?: () => void;
  /**
   * The value associated with this item.
   */
  value: DragDropIdentifier;

  /**
   * The React element which will be passed the draggable handlers
   */
  children: ReactElement;

  /**
   * Disable any drag & drop behaviour
   */
  isDisabled?: boolean;
  /**
   * The optional test subject associated with this DOM element.
   */
  dataTestSubj?: string;

  /**
   * items belonging to the same group that can be reordered
   */
  reorderableGroup?: Array<{ id: string }>;

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move';
  /**
   * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
   */
  order: number[];
}

/**
 * The props for a draggable instance of that component.
 */
interface DraggableInnerProps extends BaseProps {
  dndDispatch: React.Dispatch<DragDropAction>;
  dataTestSubjPrefix?: string;
  activeDraggingProps?: {
    keyboardMode: boolean;
    activeDropTarget?: DropIdentifier;
    dropTargetsByOrder: RegisteredDropTargets;
  };
  extraKeyboardHandler?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  ariaDescribedBy?: string;
}

const REORDER_OFFSET = REORDER_ITEM_MARGIN / 2;

/**
 * DragDrop component
 * @param props
 * @constructor
 */
export const Draggable = (props: BaseProps) => {
  const [dndState, dndDispatch] = useDragDropContext();

  if (props.isDisabled) {
    return props.children;
  }

  const { dragging, dropTargetsByOrder, keyboardMode, activeDropTarget, dataTestSubjPrefix } =
    dndState;

  const { value, reorderableGroup } = props;
  const isDragging = !!(value.id === dragging?.id);

  const activeDraggingProps = isDragging
    ? {
        keyboardMode,
        activeDropTarget,
        dropTargetsByOrder,
      }
    : undefined;

  const dragProps = {
    ...props,
    activeDraggingProps,
    dataTestSubjPrefix,
    dndDispatch,
  };
  if (reorderableGroup && reorderableGroup.length > 1) {
    return <ReorderableDraggableInner {...dragProps} reorderableGroup={reorderableGroup} />;
  }
  return <DraggableInner {...dragProps} />;
};

const removeSelection = () => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
};

const DraggableInner = memo(function DraggableInner({
  value,
  order,
  children,
  className,
  dndDispatch,
  dragType,
  activeDraggingProps,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  dataTestSubj,
  dataTestSubjPrefix,
  ariaDescribedBy,
}: DraggableInnerProps) {
  const { keyboardMode, activeDropTarget, dropTargetsByOrder } = activeDraggingProps || {};

  const setTarget = useCallback(
    (target?: DropIdentifier) => {
      if (!target) {
        dndDispatch({
          type: 'leaveDropTarget',
        });
      } else {
        dndDispatch({
          type: 'selectDropTarget',
          payload: {
            dropTarget: target,
            dragging: value,
          },
        });
      }
    },
    [dndDispatch, value]
  );

  const setTargetOfIndex = useCallback(
    (id: string, index: number) => {
      const dropTargetsForActiveId =
        dropTargetsByOrder &&
        Object.values(dropTargetsByOrder).filter((dropTarget) => dropTarget?.id === id);
      setTarget(dropTargetsForActiveId?.[index]);
    },
    [dropTargetsByOrder, setTarget]
  );
  const modifierHandlers = useMemo(() => {
    const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (activeDropTarget?.id && ['Shift', 'Alt', 'Control'].includes(e.key)) {
        if (e.altKey) {
          setTargetOfIndex(activeDropTarget.id, 1);
        } else if (e.shiftKey) {
          setTargetOfIndex(activeDropTarget.id, 2);
        } else if (e.ctrlKey) {
          // the control option is available either for new or existing cases,
          // so need to offset based on some flags
          const offsetIndex =
            Number(activeDropTarget.humanData.canSwap) +
            Number(activeDropTarget.humanData.canDuplicate);
          setTargetOfIndex(activeDropTarget.id, offsetIndex + 1);
        } else {
          setTargetOfIndex(activeDropTarget.id, 0);
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (e.key === 'Alt' && activeDropTarget?.id) {
        setTargetOfIndex(activeDropTarget.id, 1);
      } else if (e.key === 'Shift' && activeDropTarget?.id) {
        setTargetOfIndex(activeDropTarget.id, 2);
      } else if (e.key === 'Control' && activeDropTarget?.id) {
        // the control option is available either for new or existing cases,
        // so need to offset based on some flags
        const offsetIndex =
          Number(activeDropTarget.humanData.canSwap) +
          Number(activeDropTarget.humanData.canDuplicate);
        setTargetOfIndex(activeDropTarget.id, offsetIndex + 1);
      }
    };
    return { onKeyDown, onKeyUp };
  }, [activeDropTarget, setTargetOfIndex]);

  const dragStart = useCallback(
    (e: DroppableEvent | KeyboardEvent<HTMLButtonElement>, keyboardModeOn?: boolean) => {
      // Setting stopPropgagation causes Chrome failures, so
      // we are manually checking if we've already handled this
      // in a nested child, and doing nothing if so...
      if (e && 'dataTransfer' in e && e.dataTransfer.getData('text')) {
        return;
      }

      // We only can reach the dragStart method if the element is draggable,
      // so we know we have DraggableProps if we reach this code.
      if (e && 'dataTransfer' in e) {
        e.dataTransfer.setData('text', value.humanData.label);
      }

      // Chrome causes issues if you try to render from within a
      // dragStart event, so we drop a setTimeout to avoid that.

      const currentTarget = e?.currentTarget;

      setTimeout(() => {
        dndDispatch({
          type: 'startDragging',
          payload: {
            ...(keyboardModeOn ? { keyboardMode: true } : {}),
            dragging: {
              ...value,
              ghost: keyboardModeOn
                ? {
                    children,
                    style: {
                      width: currentTarget.offsetWidth,
                      minHeight: currentTarget?.offsetHeight,
                    },
                  }
                : undefined,
            },
          },
        });
        onDragStart?.(currentTarget);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dndDispatch, value, onDragStart]
  );

  const dragEnd = useCallback(
    (e?: DroppableEvent) => {
      e?.stopPropagation();

      dndDispatch({
        type: 'endDragging',
        payload: { dragging: value },
      });
      onDragEnd?.();
    },
    [dndDispatch, value, onDragEnd]
  );

  const setNextTarget = (e: KeyboardEvent<HTMLButtonElement>, reversed = false) => {
    const nextTarget = nextValidDropTarget(
      dropTargetsByOrder,
      activeDropTarget,
      [order.join(',')],
      (el) => el?.dropType !== 'reorder',
      reversed
    );

    if (e.altKey && nextTarget?.id) {
      setTargetOfIndex(nextTarget.id, 1);
    } else if (e.shiftKey && nextTarget?.id) {
      setTargetOfIndex(nextTarget.id, 2);
    } else if (e.ctrlKey && nextTarget?.id) {
      setTargetOfIndex(nextTarget.id, 3);
    } else {
      setTarget(nextTarget);
    }
  };

  const dropToActiveDropTarget = () => {
    if (activeDropTarget) {
      const { dropType, onDrop } = activeDropTarget;
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging: value,
            dropTarget: activeDropTarget,
          },
        });
      });
      onDrop(value, dropType);
    }
  };

  const shouldShowGhostImageInstead =
    dragType === 'move' &&
    keyboardMode &&
    activeDropTarget &&
    activeDropTarget.dropType !== 'reorder';

  return (
    <div
      className={classNames(className, 'domDragDrop-isDraggable', {
        'domDragDrop-isHidden':
          (activeDraggingProps && dragType === 'move' && !keyboardMode) ||
          shouldShowGhostImageInstead,
        'domDragDrop--isDragStarted': activeDraggingProps,
      })}
      data-test-subj={`${dataTestSubjPrefix}_draggable-${value.humanData.label}`}
    >
      <EuiScreenReaderOnly showOnFocus>
        <button
          aria-label={value.humanData.label}
          aria-describedby={ariaDescribedBy || `${dataTestSubjPrefix}-keyboardInstructions`}
          className="domDragDrop__keyboardHandler"
          data-test-subj={`${dataTestSubjPrefix}-keyboardHandler`}
          onBlur={(e) => {
            if (activeDraggingProps) {
              dragEnd();
            }
          }}
          onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
            const { key } = e;
            if (key === keys.ENTER || key === keys.SPACE) {
              if (activeDropTarget) {
                dropToActiveDropTarget();
              }

              if (activeDraggingProps) {
                dragEnd();
              } else {
                dragStart(e, true);
              }
            } else if (key === keys.ESCAPE) {
              if (activeDraggingProps) {
                e.stopPropagation();
                e.preventDefault();
                dragEnd();
              }
            }
            if (extraKeyboardHandler) {
              extraKeyboardHandler(e);
            }
            if (keyboardMode) {
              if (keys.ARROW_LEFT === key || keys.ARROW_RIGHT === key) {
                setNextTarget(e, !!(keys.ARROW_LEFT === key));
              }
              modifierHandlers.onKeyDown(e);
            }
          }}
          onKeyUp={modifierHandlers.onKeyUp}
        />
      </EuiScreenReaderOnly>

      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || dataTestSubjPrefix,
        className: classNames(children.props.className, 'domDragDrop', 'domDragDrop-isDraggable'),
        draggable: true,
        onDragEnd: dragEnd,
        onDragStart: dragStart,
        onMouseDown: removeSelection,
      })}
    </div>
  );
});

const ReorderableDraggableInner = memo(function ReorderableDraggableInner(
  props: DraggableInnerProps & {
    reorderableGroup: Array<{ id: string }>;
    dragging?: DragDropIdentifier;
  }
) {
  const [{ isReorderOn, reorderedItems, direction }, reorderDispatch] = useContext(ReorderContext);

  const { value, activeDraggingProps, reorderableGroup, dndDispatch, dataTestSubjPrefix } = props;

  const { keyboardMode, activeDropTarget, dropTargetsByOrder } = activeDraggingProps || {};
  const isDragging = !!activeDraggingProps;

  const isFocusInGroup = keyboardMode
    ? isDragging &&
      (!activeDropTarget || reorderableGroup.some((i) => i.id === activeDropTarget?.id))
    : isDragging;

  useEffect(() => {
    reorderDispatch({
      type: 'setIsReorderOn',
      payload: isFocusInGroup,
    });
  }, [reorderDispatch, isFocusInGroup]);

  const onReorderableDragStart = (
    currentTarget?:
      | DroppableEvent['currentTarget']
      | KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => {
    if (currentTarget) {
      setTimeout(() => {
        reorderDispatch({
          type: 'registerDraggingItemHeight',
          payload: currentTarget.offsetHeight + REORDER_OFFSET,
        });
      });
    }
  };

  const onReorderableDragEnd = () => {
    reorderDispatch({ type: 'reset' });
  };

  const extraKeyboardHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isReorderOn && keyboardMode) {
      e.stopPropagation();
      e.preventDefault();
      let activeDropTargetIndex = reorderableGroup.findIndex((i) => i.id === value.id);
      if (activeDropTarget) {
        const index = reorderableGroup.findIndex((i) => i.id === activeDropTarget?.id);
        if (index !== -1) activeDropTargetIndex = index;
      }
      if (e.key === keys.ARROW_LEFT || e.key === keys.ARROW_RIGHT) {
        reorderDispatch({ type: 'reset' });
      } else if (keys.ARROW_DOWN === e.key) {
        if (activeDropTargetIndex < reorderableGroup.length - 1) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            activeDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder'
          );
          onReorderableDragOver(nextTarget);
        }
      } else if (keys.ARROW_UP === e.key) {
        if (activeDropTargetIndex > 0) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            activeDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder',
            true
          );
          onReorderableDragOver(nextTarget);
        }
      }
    }
  };

  const onReorderableDragOver = (target?: DropIdentifier) => {
    if (!target) {
      reorderDispatch({ type: 'reset' });
      dndDispatch({ type: 'leaveDropTarget' });
      return;
    }
    const droppingIndex = reorderableGroup.findIndex((i) => i.id === target.id);
    const draggingIndex = reorderableGroup.findIndex((i) => i.id === value?.id);
    if (draggingIndex === -1) {
      return;
    }

    dndDispatch({
      type: 'selectDropTarget',
      payload: {
        dropTarget: target,
        dragging: value,
      },
    });
    reorderDispatch({
      type: 'setReorderedItems',
      payload: { draggingIndex, droppingIndex, items: reorderableGroup },
    });
  };

  const areItemsReordered = keyboardMode && isDragging && reorderedItems.length;

  return (
    <div
      data-test-subj={`${dataTestSubjPrefix}-reorderableDrag`}
      className={classNames('domDragDrop-reorderable', {
        ['domDragDrop-translatableDrag']: isDragging,
        ['domDragDrop-isKeyboardReorderInProgress']: keyboardMode && isDragging,
      })}
      style={
        areItemsReordered
          ? {
              transform: `translateY(${direction === '+' ? '-' : '+'}${reorderedItems.reduce(
                (acc, el) => acc + (el.height ?? 0) + REORDER_OFFSET,
                0
              )}px)`,
            }
          : undefined
      }
    >
      <DraggableInner
        {...props}
        ariaDescribedBy={`${dataTestSubjPrefix}-keyboardInstructionsWithReorder`}
        extraKeyboardHandler={extraKeyboardHandler}
        onDragStart={onReorderableDragStart}
        onDragEnd={onReorderableDragEnd}
      />
    </div>
  );
});
