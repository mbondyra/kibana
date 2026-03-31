/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomPaletteParams, PaletteOutput, RequiredPaletteParamTypes } from '@kbn/coloring';
import { DEFAULT_CONTINUITY, FIXED_PROGRESSION } from '@kbn/coloring';
import type { SuggestionRequest } from '../../types';
import type { GaugeVisualizationState } from './types';

export const DEFAULT_GAUGE_PALETTE_NAME = 'status';

export const defaultGaugePaletteParams: RequiredPaletteParamTypes = {
  name: DEFAULT_GAUGE_PALETTE_NAME,
  reverse: false,
  rangeType: 'percent',
  rangeMin: 0,
  rangeMax: 100,
  progression: FIXED_PROGRESSION,
  stops: [],
  steps: 4,
  colorStops: [],
  continuity: DEFAULT_CONTINUITY,
  maxSteps: 5,
};

export const DEFAULT_GAUGE_PALETTE: PaletteOutput<CustomPaletteParams> = {
  name: DEFAULT_GAUGE_PALETTE_NAME,
  type: 'palette',
  params: defaultGaugePaletteParams,
};

export const resolveGaugeColoringState = (
  state: Pick<GaugeVisualizationState, 'colorMode' | 'palette'>,
  {
    mainPalette,
    defaultPalette = DEFAULT_GAUGE_PALETTE,
  }: {
    mainPalette?: SuggestionRequest['mainPalette'];
    defaultPalette?: PaletteOutput<CustomPaletteParams>;
  } = {}
): {
  colorMode: 'palette' | 'none';
  palette: PaletteOutput<CustomPaletteParams> | undefined;
} => {
  if (state.colorMode === 'none') {
    return { colorMode: 'none', palette: undefined };
  }

  const palette =
    state.palette?.params != null
      ? state.palette
      : mainPalette?.type === 'legacyPalette'
      ? mainPalette.value
      : defaultPalette;

  return { colorMode: 'palette', palette };
};
