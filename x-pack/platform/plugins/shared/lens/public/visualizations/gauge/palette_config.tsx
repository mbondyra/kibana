/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredPaletteParamTypes, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import {
  DEFAULT_GAUGE_PALETTE,
  DEFAULT_GAUGE_PALETTE_NAME,
  defaultGaugePaletteParams,
} from '@kbn/lens-common';

export const DEFAULT_PALETTE_NAME = DEFAULT_GAUGE_PALETTE_NAME;
export const DEFAULT_COLOR_STEPS = defaultGaugePaletteParams.steps;
export const DEFAULT_MIN_STOP = defaultGaugePaletteParams.rangeMin;
export const DEFAULT_MAX_STOP = defaultGaugePaletteParams.rangeMax;

export const defaultPaletteParams = defaultGaugePaletteParams satisfies RequiredPaletteParamTypes;

export const DEFAULT_PALETTE = DEFAULT_GAUGE_PALETTE satisfies PaletteOutput<CustomPaletteParams>;
