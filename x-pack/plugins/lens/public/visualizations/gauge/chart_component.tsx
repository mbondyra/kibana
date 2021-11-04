/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { BandFillColorAccessorInput, Chart, Goal, Settings } from '@elastic/charts';
// import type { CustomPaletteState } from 'src/plugins/charts/public';
import { VisualizationContainer } from '../../visualization_container';
import type { GaugeRenderProps } from './types';
import './index.scss';
import {
  // applyPaletteParams,
  // defaultPaletteParams,
  EmptyPlaceholder,
  // findMinMaxByColumnId,
} from '../../shared_components';
import { LensIconChartGaugeHorizontal, LensIconChartGaugeVertical } from '../../assets/chart_gauge';
// import { DEFAULT_PALETTE_NAME } from './constants';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

// function getStops(
//   { colors, stops, range }: CustomPaletteState,
//   { min, max }: { min: number; max: number }
// ) {
//   if (stops.length) {
//     return stops.slice(0, stops.length - 1);
//   }
//   // Do not use relative values here
//   const maxValue = range === 'percent' ? 100 : max;
//   const minValue = range === 'percent' ? 0 : min;
//   const step = (maxValue - minValue) / colors.length;
//   return colors.slice(0, colors.length - 1).map((_, i) => minValue + (i + 1) * step);
// }

// function computeColorRanges(
//   paletteService: GaugeRenderProps['paletteService'],
//   paletteParams: CustomPaletteState | undefined,
//   baseColor: string,
//   minMax: { min: number; max: number }
// ) {
//   const paletteColors =
//     paletteParams?.colors ||
//     applyPaletteParams(paletteService, { type: 'palette', name: DEFAULT_PALETTE_NAME }, minMax).map(
//       ({ color }) => color
//     );
//   // Repeat the first color at the beginning to cover below and above the defined palette
//   const colors = [paletteColors[0], ...paletteColors];

//   const ranges = shiftAndNormalizeStops(
//     {
//       gradient: false,
//       range: defaultPaletteParams.rangeType,
//       rangeMin: defaultPaletteParams.rangeMin,
//       rangeMax: defaultPaletteParams.rangeMax,
//       stops: [],
//       ...paletteParams,
//       colors: colors.slice(1),
//     },
//     minMax
//   );

//   return { colors, ranges };
// }

export const GaugeComponent: FC<GaugeRenderProps> = ({
  data,
  args,
  timeZone,
  formatFactory,
  chartsThemeService,
  onClickValue,
  onSelectRange,
  paletteService,
}) => {
  const chartTheme = chartsThemeService.useChartsTheme();
  // const isDarkTheme = chartsThemeService.useDarkMode();

  const tableId = Object.keys(data.tables)[0];
  const table = data.tables[tableId];

  // const paletteParams = args.palette?.params;

  // const minColumnIndex = table.columns.findIndex((v) => v.id === args.minAccessor);
  // const yAxisColumnIndex = table.columns.findIndex((v) => v.id === args.maxAccessor);

  // const xAxisColumn = table.columns[minColumnIndex];
  // const yAxisColumn = table.columns[yAxisColumnIndex];
  // const valueColumn = table.columns.find((v) => v.id === args.goalAccessor);

  // todo: this should use min and max
  // const minMaxByColumnId = useMemo(
  //   () => findMinMaxByColumnId([args.goalAccessor!], table),
  //   [args.goalAccessor, table]
  // );

  // if (!xAxisColumn || !valueColumn) {
  //   // Chart is not ready
  //   return null;
  // }

  let chartData = table.rows.filter((v) => typeof v[args.metricAccessor!] === 'number');

  console.log(chartData);
  // if (!yAxisColumn) {
  //   // required for tooltip
  //   chartData = chartData.map((row) => {
  //     return {
  //       ...row,
  //       unifiedY: '',
  //     };
  //   });
  // }

  // Fallback to the ordinal scale type when a single row of data is provided.
  // Related issue https://github.com/elastic/elastic-charts/issues/1184

  const subtype = args.shape; // GoalSubtype.HorizontalBullet || GoalSubtype.VerticalBullet;

  if (
    !chartData ||
    !chartData.length ||
    !args.metricAccessor ||
    !args.minAccessor ||
    !args.maxAccessor
  ) {
    return (
      <EmptyPlaceholder
        icon={
          subtype === 'horizontalBullet' ? LensIconChartGaugeHorizontal : LensIconChartGaugeVertical
        }
      />
    );
  }

  const min = table.rows[0][args.minAccessor];
  const bands = [min, table.rows[0][args.maxAccessor]];
  function getTicks(ticksPosition: 'none' | 'auto' | 'bands') {
    if (ticksPosition === 'none') {
      return [];
    } else if (ticksPosition === 'auto') {
      // const min = args.minAccessor

      return bands; //todo: no se
    } else {
      return bands;
    }
  }

  const ticks = getTicks(args.appearance.ticksPosition);

  const metricColumn = data.tables[tableId].columns.find((col) => col.id === args.metricAccessor);
  console.log(metricColumn, 'metricColumn');

  function getTitle(title?: string, titleMode) {
    if (titleMode === 'none') {
      return '';
    } else if (titleMode === 'auto') {
      return metricColumn?.name || '';
    }
    return title || metricColumn?.name || '';
  }
  const title = getTitle(args.appearance.title, args.appearance.titleMode);

  const subtitle = args.appearance.subtitle;

  const actual = table.rows[0][args.metricAccessor];

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
        target={args.goalAccessor && table.rows[0][args.goalAccessor]}
        actual={actual}
        bands={bands}
        ticks={ticks}
        tickValueFormatter={({ value: tickValue }) =>
          formatter ? formatter.convert(tickValue) : String(tickValue)
        }
        //  bandFillColor={({ value }: BandFillColorAccessorInput) => bandFillColor(value)}
        labelMajor={title}
        labelMinor={subtitle || ''}
      />
    </Chart>
  );
};

const MemoizedChart = React.memo(GaugeComponent);

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
      <MemoizedChart {...props} />
    </VisualizationContainer>
  );
}
