/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { Chart, Goal, Settings } from '@elastic/charts';
import type { CustomPaletteState } from 'src/plugins/charts/public';
import { scaleLinear } from 'd3-scale';
import { VisualizationContainer } from '../../visualization_container';
import type { GaugeRenderProps } from './types';
import './index.scss';
import { EmptyPlaceholder } from '../../shared_components';
import { LensIconChartGaugeHorizontal, LensIconChartGaugeVertical } from '../../assets/chart_gauge';
import { GaugeTitleMode } from '../../../../../../node_modules/x-pack/plugins/lens/common/expressions/gauge_chart';

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

function getTitle(titleMode: GaugeTitleMode, title?: string, fallbackTitle?: string) {
  if (titleMode === 'none') {
    return '';
  } else if (titleMode === 'auto') {
    return `${fallbackTitle || ''}   `;
  }
  return `${title || fallbackTitle || ''}   `;
}

const getDefaultMax = (metric: number, goal?: number) => {
  const FALLBACK_VALUE = 100;
  const MAX_FACTOR = 1.2;
  return Math.max(goal || 0, metric) * MAX_FACTOR || FALLBACK_VALUE;
};

function getTicks(ticksPosition: 'none' | 'auto' | 'bands', range, colorBands) {
  if (ticksPosition === 'none') {
    return [];
  } else if (ticksPosition === 'auto') {
    const TICKS_NO = 3;
    return scaleLinear().domain(range).nice().ticks(TICKS_NO);
  } else {
    return colorBands;
  }
}

export const GaugeComponent: FC<GaugeRenderProps> = ({
  data,
  args,
  formatFactory,
  chartsThemeService,
  paletteService,
}) => {
  const {
    appearance: { subtitle, title, titleMode, ticksPosition },
    shape: subtype,
    title: visTitle,
    description,
    goalAccessor,
    maxAccessor,
    minAccessor,
    metricAccessor,
    palette,
  } = args;

  const chartTheme = chartsThemeService.useChartsTheme();
  // const isDarkTheme = chartsThemeService.useDarkMode();

  const table = Object.values(data.tables)[0];
  const chartData = table.rows.filter((v) => typeof v[metricAccessor!] === 'number');

  if (!metricAccessor) {
    return (
      <VisualizationContainer
        reportTitle={visTitle}
        reportDescription={description}
        className="lnsGaugeExpression__container"
      />
    );
  }

  if (!chartData || !chartData.length || !metricAccessor) {
    return (
      <EmptyPlaceholder
        icon={
          subtype === 'horizontalBullet' ? LensIconChartGaugeHorizontal : LensIconChartGaugeVertical
        }
      />
    );
  }

  const row = chartData[0];
  const metric = row[metricAccessor];
  const goal = goalAccessor && row[goalAccessor];
  const min = minAccessor && typeof row[minAccessor] === 'number' ? row[minAccessor] : 0;
  const max =
    maxAccessor && typeof row[maxAccessor] === 'number'
      ? row[maxAccessor]
      : getDefaultMax(metric, goal);
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
        actual={metric}
        bands={bands}
        ticks={getTicks(ticksPosition, [min, max], ranges)}
        tickValueFormatter={({ value: tickValue }) =>
          formatter ? formatter.convert(tickValue) : String(tickValue)
        }
        bandFillColor={(val) => {
          const index = ranges && ranges.indexOf(val.value) - 1;
          return index !== undefined && colors && index >= 0 ? colors[index] : 'rgb(255,255,255)';
        }}
        labelMajor={getTitle(titleMode, title, metricColumn?.name)}
        labelMinor={subtitle ? subtitle + '  ' : ''}
      />
    </Chart>
  );
};

export function GaugeChartReportable(props: GaugeRenderProps) {
  const [state, setState] = useState({
    isReady: false,
  });

  // It takes a cycle for the chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, [setState]);

  return (
    <VisualizationContainer
      className="lnsGaugeExpression__container"
      isReady={state.isReady}
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
      <GaugeComponent {...props} />
    </VisualizationContainer>
  );
}
