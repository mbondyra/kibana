/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, memo, useState, useRef } from 'react';
import type { ReactElement } from 'react';
import classNames from 'classnames';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import {
  DragDropIdentifier,
  ReorderContext,
  DropHandler,
  Ghost,
  DragDropAction,
  DragContextState,
  useDragDropContext,
} from './providers';
import { DropType } from './types';
import './sass/drag_drop.scss';

/**
 * Droppable event
 */
export type DroppableEvent = React.DragEvent<HTMLElement>;

const noop = () => {};

/**
 * The base props to the DragDrop component.
 */
interface BaseProps {
  /**
   * The CSS class(es) for the root element.
   */
  className?: string;

  /**
   * The event handler that fires when an item
   * is dropped onto this DragDrop component.
   */
  onDrop?: DropHandler;
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
   * Additional class names to apply when another element is over the drop target
   */
  getAdditionalClassesOnEnter?: (dropType?: DropType) => string | undefined;
  /**
   * Additional class names to apply when another element is droppable for a currently dragged item
   */
  getAdditionalClassesOnDroppable?: (dropType?: DropType) => string | undefined;

  /**
   * The optional test subject associated with this DOM element.
   */
  dataTestSubj?: string;

  /**
   * items belonging to the same group that can be reordered
   */
  reorderableGroup?: Array<{ id: string }>;
  /**
   * Indicates the type of drop targets - when undefined, the currently dragged item
   * cannot be dropped onto this component.
   */
  dropTypes?: DropType[];
  /**
   * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
   */
  order: number[];
  /**
   * Extra drop targets by dropType
   */
  getCustomDropTarget?: (dropType: DropType) => ReactElement | null;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface DroppableInnerProps extends BaseProps {
  dndState: DragContextState;
  dndDispatch: React.Dispatch<DragDropAction>;
  isNotDroppable: boolean;
}

/**
 * DragDrop component
 * @param props
 * @constructor
 */
export const Droppable = (props: BaseProps) => {
  const [dndState, dndDispatch] = useDragDropContext();

  const { dragging } = dndState;

  if (props.isDisabled) {
    return props.children;
  }

  const { value, dropTypes, reorderableGroup } = props;

  const dropProps = {
    ...props,
    dndState,
    dndDispatch,
    isNotDroppable:
      // If the configuration has provided a droppable flag, but this particular item is not
      // droppable, then it should be less prominent. Ignores items that are both
      // draggable and drop targets
      !!((!dropTypes || !dropTypes.length) && dragging && value.id !== dragging.id),
  };
  if (
    reorderableGroup &&
    reorderableGroup.length > 1 &&
    reorderableGroup?.some((i) => i.id === dragging?.id) &&
    dropTypes?.[0] === 'reorder'
  ) {
    return <ReorderableDroppableInner {...dropProps} reorderableGroup={reorderableGroup} />;
  }
  return <DroppableInner {...dropProps} />;
};

const DroppableInner = memo(function DroppableInner(props: DroppableInnerProps) {
  const {
    dataTestSubj,
    className,
    onDrop,
    value,
    children,
    dndState,
    dndDispatch,
    isNotDroppable,
    dropTypes,
    order,
    getAdditionalClassesOnEnter,
    getAdditionalClassesOnDroppable,
    getCustomDropTarget,
  } = props;

  const { dragging, activeDropTarget, dataTestSubjPrefix, keyboardMode } = dndState;

  const [isInZone, setIsInZone] = useState(false);
  const mainTargetRef = useRef<HTMLDivElement>(null);

  useShallowCompareEffect(() => {
    if (dropTypes && dropTypes?.[0] && onDrop && keyboardMode) {
      dndDispatch({
        type: 'registerDropTargets',
        payload: dropTypes.reduce(
          (acc, dropType, index) => ({
            ...acc,
            [[...order, index].join(',')]: { ...value, onDrop, dropType },
          }),
          {}
        ),
      });
    }
  }, [order, dndDispatch, dropTypes, keyboardMode]);

  useEffect(() => {
    let isMounted = true;
    if (activeDropTarget && activeDropTarget.id !== value.id) {
      setIsInZone(false);
    }
    setTimeout(() => {
      if (!activeDropTarget && isMounted) {
        setIsInZone(false);
      }
    }, 1000);
    return () => {
      isMounted = false;
    };
  }, [activeDropTarget, setIsInZone, value.id]);

  const dragEnter = () => {
    if (!isInZone) {
      setIsInZone(true);
    }
  };

  const getModifiedDropType = (e: DroppableEvent, dropType: DropType) => {
    if (!dropTypes || dropTypes.length <= 1) {
      return dropType;
    }
    const dropIndex = dropTypes.indexOf(dropType);
    if (dropIndex > 0) {
      return dropType;
    } else if (dropIndex === 0) {
      if (e.altKey && dropTypes[1]) {
        return dropTypes[1];
      } else if (e.shiftKey && dropTypes[2]) {
        return dropTypes[2];
      } else if (e.ctrlKey && (dropTypes.length > 3 ? dropTypes[3] : dropTypes[1])) {
        return dropTypes.length > 3 ? dropTypes[3] : dropTypes[1];
      }
    }
    return dropType;
  };

  const dragOver = (e: DroppableEvent, dropType: DropType) => {
    e.preventDefault();
    if (!dragging || !onDrop) {
      return;
    }

    const modifiedDropType = getModifiedDropType(e, dropType);
    const isActiveDropTarget = !!(
      activeDropTarget?.id === value.id && activeDropTarget?.dropType === modifiedDropType
    );
    // An optimization to prevent a bunch of React churn.
    if (!isActiveDropTarget) {
      dndDispatch({
        type: 'selectDropTarget',
        payload: {
          dropTarget: { ...value, dropType: modifiedDropType, onDrop },
          dragging,
        },
      });
    }
  };

  const dragLeave = () => {
    dndDispatch({ type: 'leaveDropTarget' });
  };

  const drop = (e: DroppableEvent, dropType: DropType) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInZone(false);
    if (onDrop && dragging) {
      const modifiedDropType = getModifiedDropType(e, dropType);
      onDrop(dragging, modifiedDropType);
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging,
            dropTarget: { ...value, dropType: modifiedDropType, onDrop },
          },
        });
      });
    }
    dndDispatch({ type: 'resetState' });
  };

  const getProps = (dropType?: DropType, dropChildren?: ReactElement) => {
    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && dropType === activeDropTarget?.dropType
    );
    return {
      'data-test-subj': dataTestSubj || dataTestSubjPrefix,
      className: getClasses(dropType, dropChildren),
      onDragEnter: dragEnter,
      onDragLeave: dragLeave,
      onDragOver: dropType ? (e: DroppableEvent) => dragOver(e, dropType) : noop,
      onDrop: dropType ? (e: DroppableEvent) => drop(e, dropType) : noop,
      ghost:
        (isActiveDropTarget && dropType !== 'reorder' && dragging?.ghost && dragging.ghost) ||
        undefined,
    };
  };

  const getClasses = (dropType?: DropType, dropChildren = children) => {
    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && dropType === activeDropTarget?.dropType
    );
    const classesOnDroppable = getAdditionalClassesOnDroppable?.(dropType);

    const classes = classNames(
      'domDragDrop',
      'domDragDrop-isDroppable',
      {
        'domDragDrop-isDropTarget': dropType,
        'domDragDrop-isActiveDropTarget': dropType && isActiveDropTarget,
        'domDragDrop-isNotDroppable': isNotDroppable,
      },
      classesOnDroppable && { [classesOnDroppable]: dropType }
    );
    return classNames(classes, className, dropChildren.props.className);
  };

  const getMainTargetClasses = () => {
    const classesOnEnter = getAdditionalClassesOnEnter?.(activeDropTarget?.dropType);
    return classNames(classesOnEnter && { [classesOnEnter]: activeDropTarget?.id === value.id });
  };

  const mainTargetProps = getProps(dropTypes && dropTypes[0]);

  return (
    <div
      data-test-subj={`${dataTestSubjPrefix}Container`}
      className={classNames('domDragDrop__container', {
        'domDragDrop__container-active': isInZone || activeDropTarget?.id === value.id,
      })}
      onDragEnter={dragEnter}
      ref={mainTargetRef}
    >
      <SingleDropInner
        {...mainTargetProps}
        className={classNames(mainTargetProps.className, getMainTargetClasses())}
        children={children}
      />
      {dropTypes && dropTypes.length > 1 && (
        <EuiFlexGroup
          gutterSize="none"
          direction="column"
          data-test-subj={`${dataTestSubjPrefix}ExtraDrops`}
          className={classNames('domDragDrop__extraDrops', {
            'domDragDrop__extraDrops-visible': isInZone || activeDropTarget?.id === value.id,
          })}
        >
          {dropTypes.slice(1).map((dropType) => {
            const dropChildren = getCustomDropTarget?.(dropType);
            return dropChildren ? (
              <EuiFlexItem key={dropType} className="domDragDrop__extraDropWrapper">
                <SingleDropInner {...getProps(dropType, dropChildren)}>
                  {dropChildren}
                </SingleDropInner>
              </EuiFlexItem>
            ) : null;
          })}
        </EuiFlexGroup>
      )}
    </div>
  );
});

const SingleDropInner = ({
  ghost,
  children,
  ...rest
}: {
  ghost?: Ghost;
  children: ReactElement;
  style?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <>
      {React.cloneElement(children, rest)}
      {ghost
        ? React.cloneElement(ghost.children, {
            className: classNames(ghost.children.props.className, 'domDragDrop_ghost'),
            style: ghost.style,
          })
        : null}
    </>
  );
};

const ReorderableDroppableInner = memo(function ReorderableDroppableInner(
  props: DroppableInnerProps & { reorderableGroup: Array<{ id: string }> }
) {
  const { onDrop, value, dndState, dndDispatch, reorderableGroup } = props;

  const { dragging, dataTestSubjPrefix, activeDropTarget } = dndState;
  const currentIndex = reorderableGroup.findIndex((i) => i.id === value.id);

  const [{ isReorderOn, reorderedItems, draggingHeight, direction }, reorderDispatch] =
    useContext(ReorderContext);

  const heightRef = useRef<HTMLDivElement>(null);

  const isReordered =
    isReorderOn && reorderedItems.some((el) => el.id === value.id) && reorderedItems.length;

  useEffect(() => {
    if (isReordered && heightRef.current?.clientHeight) {
      reorderDispatch({
        type: 'registerReorderedItemHeight',
        payload: { id: value.id, height: heightRef.current.clientHeight },
      });
    }
  }, [isReordered, reorderDispatch, value.id]);

  const onReorderableDragOver = (e: DroppableEvent) => {
    e.preventDefault();
    // An optimization to prevent a bunch of React churn.
    if (activeDropTarget?.id !== value?.id && onDrop) {
      const draggingIndex = reorderableGroup.findIndex((i) => i.id === dragging?.id);
      if (!dragging || draggingIndex === -1) {
        return;
      }

      const droppingIndex = currentIndex;
      if (draggingIndex === droppingIndex) {
        reorderDispatch({ type: 'reset' });
      }

      reorderDispatch({
        type: 'setReorderedItems',
        payload: { draggingIndex, droppingIndex, items: reorderableGroup },
      });
      dndDispatch({
        type: 'selectDropTarget',
        payload: {
          dropTarget: { ...value, dropType: 'reorder', onDrop },
          dragging,
        },
      });
    }
  };

  const onReorderableDrop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDrop && dragging) {
      onDrop(dragging, 'reorder');
      // setTimeout ensures it will run after dragEnd messaging
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging,
            dropTarget: { ...value, dropType: 'reorder', onDrop },
          },
        });
      });
    }
    dndDispatch({ type: 'resetState' });
  };

  return (
    <div>
      <div
        style={
          reorderedItems.some((i) => i.id === value.id)
            ? {
                transform: `translateY(${direction}${draggingHeight}px)`,
              }
            : undefined
        }
        ref={heightRef}
        data-test-subj={`${dataTestSubjPrefix}-translatableDrop`}
        className="domDragDrop-translatableDrop domDragDrop-reorderable"
      >
        <DroppableInner {...props} />
      </div>

      <div
        data-test-subj={`${dataTestSubjPrefix}-reorderableDropLayer`}
        className={classNames('domDragDrop', {
          ['domDragDrop__reorderableDrop']: dragging,
        })}
        onDrop={onReorderableDrop}
        onDragOver={onReorderableDragOver}
        onDragLeave={() => {
          dndDispatch({ type: 'leaveDropTarget' });
          reorderDispatch({ type: 'reset' });
        }}
      />
    </div>
  );
});
