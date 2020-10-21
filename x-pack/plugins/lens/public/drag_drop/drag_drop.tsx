/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './drag_drop.scss';

import React, { useState, useContext } from 'react';
import classNames from 'classnames';
import { DragContext, DragContextState, ReorderContext } from './providers';
import { trackUiEvent } from '../lens_ui_telemetry';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';

export type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * A function that handles a drop event.
 */
export type DropHandler = (item: unknown) => void;

/**
 * A function that handles a drop event.
 */
export type DropToHandler = (dropTargetId: string) => void;

/**
 * The base props to the DragDrop component.
 */
interface BaseProps {
  /**
   * The CSS class(es) for the root element.
   */
  className?: string;

  /**
   * The event handler that fires when this item
   * is dropped to the one with passed id
   *
   */
  dropTo?: DropToHandler;
  /**
   * The event handler that fires when an item
   * is dropped onto this DragDrop component.
   */
  onDrop?: DropHandler;
  /**
   * The value associated with this item, if it is draggable.
   * If this component is dragged, this will be the value of
   * "dragging" in the root drag/drop context.
   */
  value?: DragContextState['dragging'];

  /**
   * Optional comparison function to check whether a value is the dragged one
   */
  isValueEqual?: (value1: unknown, value2: unknown) => boolean;

  /**
   * The React element which will be passed the draggable handlers
   */
  children: React.ReactElement;

  /**
   * Indicates whether or not the currently dragged item
   * can be dropped onto this component.
   */
  droppable?: boolean;

  /**
   * Additional class names to apply when another element is over the drop target
   */
  getAdditionalClassesOnEnter?: () => string;

  /**
   * The optional test subject associated with this DOM element.
   */
  'data-test-subj'?: string;

  /**
   * items belonging to the same group that can be reordered
   */
  itemsInGroup?: string[];

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move' | 'reorder';

  /**
   * Indicates to the user whether the drop action will
   * replace something that is existing or add a new one
   */
  dropType?: 'add' | 'replace' | 'reorder';
}

/**
 * The props for a draggable instance of that component.
 */
interface DraggableProps extends BaseProps {
  /**
   * Indicates whether or not this component is draggable.
   */
  draggable: true;
  /**
   * The label, which should be attached to the drag event, and which will e.g.
   * be used if the element will be dropped into a text field.
   */
  label: string;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface NonDraggableProps extends BaseProps {
  /**
   * Indicates whether or not this component is draggable.
   */
  draggable?: false;
}

type Props = DraggableProps | NonDraggableProps;

/**
 * A draggable / droppable item. Items can be both draggable and droppable at
 * the same time.
 *
 * @param props
 */

export const DragDrop = (props: Props) => {
  const { dragging, setDragging } = useContext(DragContext);
  const { value, draggable, droppable, isValueEqual } = props;

  return (
    <DragDropInner
      {...props}
      dragging={droppable ? dragging : undefined}
      setDragging={setDragging}
      isDragging={
        !!(draggable && ((isValueEqual && isValueEqual(value, dragging)) || value === dragging))
      }
      isNotDroppable={
        // If the configuration has provided a droppable flag, but this particular item is not
        // droppable, then it should be less prominent. Ignores items that are both
        // draggable and drop targets
        droppable === false && Boolean(dragging) && value !== dragging
      }
    />
  );
};

const DragDropInner = React.memo(function DragDropInner(
  props: Props &
    DragContextState & {
      isDragging: boolean;
      isNotDroppable: boolean;
    }
) {
  const [state, setState] = useState({
    isActive: false,
    dragEnterClassNames: '',
    keyboardInteraction: false,
  });
  const {
    className,
    onDrop,
    value,
    children,
    droppable,
    draggable,
    dragging,
    setDragging,
    isDragging,
    isNotDroppable,
    dragType = 'copy',
    dropType = 'add',
    dropTo,
    itemsInGroup,
  } = props;

  const isMoveDragging = isDragging && dragType === 'move';
  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDragging': isDragging,
      'lnsDragDrop-isHidden': isMoveDragging,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget': droppable && dragType !== 'reorder',
      'lnsDragDrop-isActiveDropTarget': droppable && state.isActive && dragType !== 'reorder',
      'lnsDragDrop-isNotDroppable': !isMoveDragging && isNotDroppable,
      'lnsDragDrop-isReplacing': droppable && state.isActive && dropType === 'replace',
    },
    className,
    state.dragEnterClassNames
  );

  const dragStart = (e: DroppableEvent) => {
    // Setting stopPropgagation causes Chrome failures, so
    // we are manually checking if we've already handled this
    // in a nested child, and doing nothing if so...
    if (e.dataTransfer.getData('text')) {
      return;
    }

    // We only can reach the dragStart method if the element is draggable,
    // so we know we have DraggableProps if we reach this code.
    e.dataTransfer.setData('text', (props as DraggableProps).label);

    // Chrome causes issues if you try to render from within a
    // dragStart event, so we drop a setTimeout to avoid that.
    setState({ ...state, keyboardInteraction: false });
    setTimeout(() => setDragging(value));
  };

  const dragEnd = (e: DroppableEvent) => {
    e.stopPropagation();
    setDragging(undefined);
  };

  const dragOver = (e: DroppableEvent) => {
    if (!droppable) {
      return;
    }

    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    if (!state.isActive) {
      setState({
        ...state,
        isActive: true,
        dragEnterClassNames: props.getAdditionalClassesOnEnter
          ? props.getAdditionalClassesOnEnter()
          : '',
      });
    }
  };

  const dragLeave = () => {
    setState({ ...state, isActive: false, dragEnterClassNames: '' });
  };

  const drop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setState({ ...state, isActive: false, dragEnterClassNames: '' });
    setDragging(undefined);

    if (onDrop && droppable) {
      trackUiEvent('drop_total');
      onDrop(dragging);
    }
  };

  let element = React.cloneElement(children, {
    'data-test-subj': props['data-test-subj'] || 'lnsDragDrop',
    className: classNames(children.props.className, classes),
    onDragOver: dragOver,
    onDragLeave: dragLeave,
    onDrop: drop,
    draggable,
    onDragEnd: dragEnd,
    onDragStart: dragStart,
  });

  if (
    droppable &&
    dropType === 'reorder' &&
    itemsInGroup?.length &&
    itemsInGroup.length > 1 &&
    value?.id
  ) {
    element = (
      <ReorderableDragDrop
        draggingProps={{
          className: classNames(children.props.className, classes),
          draggable,
          onDragEnd: dragEnd,
          onDragStart: dragStart,
          ['data-test-subj']: props['data-test-subj'] || 'lnsDragDrop',
        }}
        dropProps={{
          onDrop: drop,
          onDragOver: dragOver,
          onDragLeave: dragLeave,
          dragging,
          droppable,
          itemsInGroup,
          id: value.id,
        }}
      >
        {children}
      </ReorderableDragDrop>
    );
  }

  if (!itemsInGroup?.length || itemsInGroup.length < 2 || !value || !dropTo) {
    return element;
  }
  return (
    <>
      <EuiScreenReaderOnly>
        <button
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE) {
              setState({ ...state, keyboardInteraction: !state.keyboardInteraction });
            } else if (e.key === keys.ESCAPE) {
              setState({ ...state, keyboardInteraction: false });
            }
            if (state.keyboardInteraction) {
              e.stopPropagation();
              e.preventDefault();

              const draggingIndex = itemsInGroup.indexOf(value.id);
              if (keys.ARROW_DOWN === e.key) {
                if (draggingIndex < itemsInGroup.length - 1) {
                  dropTo(itemsInGroup[draggingIndex + 1]);
                }
              } else if (keys.ARROW_UP === e.key) {
                if (draggingIndex > 0) {
                  dropTo(itemsInGroup[draggingIndex - 1]);
                }
              }
            }
          }}
        >
          Move to reorder
        </button>
      </EuiScreenReaderOnly>

      {element}
    </>
  );
});

export const ReorderableDragDrop = ({
  draggingProps,
  dropProps,
  children,
}: {
  draggingProps: {
    className: string;
    draggable: Props['draggable'];
    onDragEnd: (e: DroppableEvent) => void;
    onDragStart: (e: DroppableEvent) => void;
    ['data-test-subj']: string;
  };
  dropProps: {
    onDrop: (e: DroppableEvent) => void;
    onDragOver: (e: DroppableEvent) => void;
    onDragLeave: () => void;
    dragging: DragContextState['dragging'];
    droppable: DraggableProps['droppable'];
    itemsInGroup: string[];
    id: string;
  };
  children: React.ReactElement;
  'data-test-subj'?: string;
}) => {
  const { itemsInGroup, dragging, id, droppable } = dropProps;
  const { reorderState, setReorderState } = useContext(ReorderContext);
  return (
    <div className="lnsDragDrop__reorderableContainer">
      {React.cloneElement(children, {
        ...draggingProps,
        className: classNames(
          draggingProps.className,
          reorderState && {
            [reorderState.className]: reorderState?.reorderedItems.includes(id),
          },
          {
            'lnsDragDrop-isReorderable': draggingProps.draggable,
          }
        ),
      })}
      <div
        data-test-subj="lnsDragDrop-reorderableDrop"
        className={classNames('lnsDragDrop', {
          ['lnsDragDrop__reorderableDrop']: dragging && droppable,
        })}
        onDrop={(e) => {
          dropProps.onDrop(e);
          setReorderState({
            ...reorderState,
            reorderedItems: [],
          });
        }}
        onDragOver={(e: DroppableEvent) => {
          if (!droppable) {
            return;
          }
          dropProps.onDragOver(e);

          if (!dragging) return;
          const draggingIndex = itemsInGroup.indexOf(dragging.id);
          const droppingIndex = itemsInGroup.indexOf(id);

          setReorderState(
            draggingIndex < droppingIndex
              ? {
                  ...reorderState,
                  reorderedItems: itemsInGroup.slice(draggingIndex + 1, droppingIndex + 1),
                  className: 'lnsDragDrop-isReorderable--up',
                }
              : {
                  ...reorderState,
                  reorderedItems: itemsInGroup.slice(droppingIndex, draggingIndex),
                  className: 'lnsDragDrop-isReorderable--down',
                }
          );
        }}
        onDragLeave={() => {
          dropProps.onDragLeave();
          setReorderState({
            ...reorderState,
            reorderedItems: [],
          });
        }}
      />
    </div>
  );
};
