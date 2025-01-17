/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuntimeGridSettings } from '../../../types';
import { KeyboardCode, UserKeyboardEvent } from './types';

export const dragKeyboardCoordinateGetter = (
  event: KeyboardEvent,
  {
    currentCoordinates,
    runtimeSettings: { columnPixelWidth, gutterSize, rowHeight },
  }: {
    currentCoordinates: { left: number; right: number; top: number; bottom: number };
    runtimeSettings: RuntimeGridSettings;
  }
) => {
  switch (event.code) {
    case KeyboardCode.Right:
      return {
        ...currentCoordinates,
        left: currentCoordinates.left + columnPixelWidth + gutterSize,
        right: currentCoordinates.right + columnPixelWidth + gutterSize,
      };
    case KeyboardCode.Left:
      return {
        ...currentCoordinates,
        left: currentCoordinates.left - columnPixelWidth - gutterSize,
        right: currentCoordinates.right - columnPixelWidth - gutterSize,
      };
    case KeyboardCode.Down:
      return {
        ...currentCoordinates,
        top: currentCoordinates.top + rowHeight + gutterSize,
        bottom: currentCoordinates.bottom + rowHeight + gutterSize,
      };
    case KeyboardCode.Up:
      return {
        ...currentCoordinates,
        top: currentCoordinates.top - rowHeight - gutterSize,
        bottom: currentCoordinates.bottom - rowHeight - gutterSize,
      };
  }

  return undefined;
};

export const resizeKeyboardCoordinateGetter = (
  pressedKey: UserKeyboardEvent['code'],
  {
    currentCoordinates,
    runtimeSettings: { columnPixelWidth, gutterSize, rowHeight },
  }: {
    currentCoordinates: { left: number; right: number; top: number; bottom: number };
    runtimeSettings: RuntimeGridSettings;
  }
) => {
  switch (pressedKey) {
    case KeyboardCode.Right:
      return {
        ...currentCoordinates,

        right: currentCoordinates.right + columnPixelWidth + gutterSize,
      };
    case KeyboardCode.Left:
      return {
        ...currentCoordinates,
        right: currentCoordinates.right - columnPixelWidth - gutterSize,
      };
    case KeyboardCode.Down:
      return {
        ...currentCoordinates,
        bottom: currentCoordinates.bottom + rowHeight + gutterSize,
      };
    case KeyboardCode.Up:
      return {
        ...currentCoordinates,
        bottom: currentCoordinates.bottom - rowHeight - gutterSize,
      };
  }

  return undefined;
};
