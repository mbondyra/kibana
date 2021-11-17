/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Chart, Goal, Settings } from '@elastic/charts';
import type { CustomPaletteState } from 'src/plugins/charts/public';
import { scaleLinear } from 'd3-scale';
import { VisualizationContainer } from '../../visualization_container';
import type { GaugeRenderProps } from './types';
import './index.scss';
import { EmptyPlaceholder } from '../../shared_components';
import { LensIconChartGaugeHorizontal, LensIconChartGaugeVertical } from '../../assets/chart_gauge';
import { getMaxValue, getMinValue, getValueFromAccessor } from './utils';
import {
  GaugeShapes,
  GaugeTicksPosition,
  GaugeTitleMode,
  // GaugeColorMode,
} from '../../../common/expressions/gauge_chart';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

function getStops(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (stops.length) {
    return stops;
  }
  const step = (max - min) / colors.length;
  return colors.map((_, i) => min + i * step);
}

function shiftAndNormalizeStops(
  params: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  const baseStops = [
    ...getStops(params, { min, max }).map((value) => {
      let result = value;
      if (params.range === 'percent' && params.stops.length) {
        result = min + value * ((max - min) / 100);
      }
      // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
      if (Number.isNaN(result)) {
        return 1;
      }
      return result;
    }),
    Math.max(max, ...params.stops),
  ];
  if (params.stops.length) {
    if (params.range === 'percent') {
      baseStops.unshift(min + params.rangeMin * ((max - min) / 100));
    } else {
      baseStops.unshift(params.rangeMin);
    }
  }
  return baseStops;
}

function getTitle(visTitleMode: GaugeTitleMode, visTitle?: string, fallbackTitle?: string) {
  if (visTitleMode === 'none') {
    return '';
  } else if (visTitleMode === 'auto') {
    return `${fallbackTitle || ''}   `;
  }
  return `${visTitle || fallbackTitle || ''}   `;
}

function getTicks(
  ticksPosition: GaugeTicksPosition,
  range: [number, number],
  colorBands?: number[]
) {
  if (ticksPosition === 'none') {
    return [];
  } else if (ticksPosition === 'auto') {
    const TICKS_NO = 3;
    return scaleLinear().domain(range).nice().ticks(TICKS_NO);
  } else {
    return colorBands;
  }
}

// function getColorStyling(
//   value: number,
//   colorMode: GaugeColorMode,
//   palette: PaletteOutput<CustomPaletteState> | undefined
// ) {
//   if (colorMode === 'none' || !palette?.params || !palette?.params.colors?.length || isNaN(value)) {
//     return `rgb(255,255,255, 0)`;
//   }

//   const { continuity = 'above', rangeMin, stops, colors } = palette.params;
//   const penultimateStop = stops[stops.length - 2];

//   if (continuity === 'none' && (value < rangeMin || value > penultimateStop)) {
//     return {};
//   }
//   if (continuity === 'below' && value > penultimateStop) {
//     return {};
//   }
//   if (continuity === 'above' && value < rangeMin) {
//     return {};
//   }

//   const rawIndex = stops.findIndex((v) => v > value);

//   let colorIndex = rawIndex;
//   if (['all', 'below'].includes(continuity) && value < rangeMin && colorIndex < 0) {
//     colorIndex = 0;
//   }
//   if (['all', 'above'].includes(continuity) && value > penultimateStop && colorIndex < 0) {
//     colorIndex = stops.length - 1;
//   }

//   return colors[colorIndex];
// }

export const GaugeComponent: FC<GaugeRenderProps> = ({
  data,
  args,
  formatFactory,
  chartsThemeService,
  paletteService,
}) => {
  const {
    shape: subtype,
    goalAccessor,
    maxAccessor,
    minAccessor,
    metricAccessor,
    palette,
    colorMode,
    subtitle,
    visTitle,
    visTitleMode,
    ticksPosition,
  } = args;

  const chartTheme = chartsThemeService.useChartsTheme();
  const table = Object.values(data.tables)[0];
  const chartData = table.rows.filter((v) => typeof v[metricAccessor!] === 'number');

  if (!metricAccessor) {
    return <VisualizationContainer className="lnsGaugeExpression__container" />;
  }
  const accessors = { maxAccessor, minAccessor, goalAccessor, metricAccessor };

  const row = chartData?.[0];
  const metricValue = getValueFromAccessor('metricAccessor', row, accessors);

  if (typeof metricValue !== 'number') {
    return (
      <EmptyPlaceholder
        icon={
          subtype === GaugeShapes.horizontalBullet
            ? LensIconChartGaugeHorizontal
            : LensIconChartGaugeVertical
        }
      />
    );
  }

  const goal = getValueFromAccessor('goalAccessor', row, accessors);
  const min = getMinValue(row, accessors);
  const max = getMaxValue(row, accessors);
  const bands = [min, max];

  const colors = (palette?.params as CustomPaletteState)?.colors ?? undefined;
  const ranges = (palette?.params as CustomPaletteState)
    ? shiftAndNormalizeStops(args.palette?.params as CustomPaletteState, { min, max })
    : undefined;

  const metricColumn = table.columns.find((col) => col.id === metricAccessor);

  const formatter = metricColumn?.meta?.params
    ? formatFactory(metricColumn.meta?.params)
    : undefined;

  return (
    <Chart>
      <Settings debugState={window._echDebugStateFlag ?? false} theme={chartTheme} />
      <Goal
        id="spec_1"
        subtype={subtype}
        base={min}
        target={goal}
        actual={metricValue}
        bands={bands}
        tickValueFormatter={({ value: tickValue }) =>
          formatter ? formatter.convert(tickValue) : String(tickValue)
        }
        ticks={getTicks(ticksPosition, [min, max], ranges)}
        bandFillColor={(val) => {
          if (colorMode === 'none') {
            return `rgb(255,255,255, 0)`;
          }
          const index = ranges && ranges.indexOf(val.value) - 1;
          return index !== undefined && colors && index >= 0 ? colors[index] : 'rgb(255,255,255)';
        }}
        labelMajor={getTitle(visTitleMode, visTitle, metricColumn?.name)}
        labelMinor={subtitle ? subtitle + '  ' : ''}
      />
    </Chart>
  );
};

export function GaugeChartReportable(props: GaugeRenderProps) {
  return (
    <VisualizationContainer className="lnsGaugeExpression__container">
      <GaugeComponent {...props} />
    </VisualizationContainer>
  );
}
