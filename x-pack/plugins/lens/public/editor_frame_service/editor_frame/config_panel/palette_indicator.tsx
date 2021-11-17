/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import { AccessorConfig } from '../../../types';
import { getStopsForFixedMode } from '../../../shared_components/coloring/utils';

export function PaletteIndicator({ accessorConfig }: { accessorConfig: AccessorConfig }) {
  if (accessorConfig.triggerIcon !== 'colorBy' || !accessorConfig.palette) return null;
  // const paletteParams = accessorConfig.palette?.params;
  // const normalizedPalette =
  //   paletteParams?.name === 'custom'
  //     ? getStopsForFixedMode(paletteParams.stops!, paletteParams.colorStops)
  //     : accessorConfig.palette;

  // console.log(accessorConfig, normalizedPalette);
  return (
    <div className="lnsLayerPanel__paletteContainer">
      <EuiColorPaletteDisplay
        className="lnsLayerPanel__palette"
        size="xs"
        palette={accessorConfig.palette}
      />
    </div>
  );
}
