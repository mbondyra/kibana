/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import {
  Chart,
  Datum,
  Partition,
  PartitionLayer,
  PartitionLayout,
  PartialTheme,
  PartitionFillLabel,
} from '@elastic/charts';
import {
  KibanaDatatableColumn,
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
  ExpressionFunctionDefinition,
} from 'src/plugins/expressions/public';
import { FormatFactory } from '../legacy_imports';
import { LensMultiTable } from '../types';
import { VisualizationContainer } from '../visualization_container';

const EMPTY_SLICE = Symbol('empty_slice');

interface Args {
  slices: string[];
  metric?: string;
  shape: 'pie' | 'donut' | 'treemap';
  hideLabels: boolean;
}

export interface PieProps {
  data: LensMultiTable;
  args: Args;
}

export interface PieRender {
  type: 'render';
  as: 'lens_pie_renderer';
  value: PieProps;
}

export const pie: ExpressionFunctionDefinition<'lens_pie', LensMultiTable, Args, PieRender> = {
  name: 'lens_pie',
  type: 'render',
  help: i18n.translate('xpack.lens.pie.expressionHelpLabel', {
    defaultMessage: 'Pie renderer',
  }),
  args: {
    slices: {
      types: ['string'],
      multi: true,
      help: '',
    },
    metric: {
      types: ['string'],
      help: '',
    },
    shape: {
      types: ['string'],
      options: ['pie', 'donut', 'treemap'],
      help: '',
    },
    hideLabels: {
      types: ['boolean'],
      help: '',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: Args) {
    return {
      type: 'render',
      as: 'lens_pie_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

export const getPieRenderer = (dependencies: {
  formatFactory: FormatFactory;
  chartTheme: PartialTheme;
}): ExpressionRenderDefinition<PieProps> => ({
  name: 'lens_pie_renderer',
  displayName: i18n.translate('xpack.lens.pie.visualizationName', {
    defaultMessage: 'Pie',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (domNode: Element, config: PieProps, handlers: IInterpreterRenderHandlers) => {
    ReactDOM.render(<MemoizedChart {...config} {...dependencies} />, domNode, () => {
      handlers.done();
    });
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

const MemoizedChart = React.memo(PieComponent);

function PieComponent(
  props: PieProps & {
    formatFactory: FormatFactory;
    chartTheme: Exclude<PartialTheme, undefined>;
  }
) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  const { chartTheme } = props;
  const { shape, hideLabels, slices, metric } = props.args;

  if (!hideLabels) {
    firstTable.columns.forEach(column => {
      formatters[column.id] = props.formatFactory(column.formatHint);
    });
  }

  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: true,
    valueFont: {
      fontWeight: 800,
    },
  };

  const columnGroups: Array<{
    col: KibanaDatatableColumn;
    metrics: KibanaDatatableColumn[];
  }> = [];
  firstTable.columns.forEach((col, index) => {
    if (slices.includes(col.id)) {
      columnGroups.push({
        col,
        metrics: [],
      });
    } else if (columnGroups.length > 0) {
      columnGroups[columnGroups.length - 1].metrics.push(col);
    }
  });

  const layers: PartitionLayer[] = columnGroups.map(({ col }, layerIndex) => {
    return {
      groupByRollup: (d: Datum) => d[col.id] ?? EMPTY_SLICE,
      showAccessor: (d: Datum) => d !== EMPTY_SLICE,
      nodeLabel: (d: unknown) => {
        if (hideLabels) {
          return '';
        }
        if (col.formatHint) {
          return formatters[col.id].convert(d) ?? '';
        }
        return d + '';
      },
      fillLabel:
        shape === 'treemap' && layerIndex > 0
          ? {
              ...fillLabel,
              valueFormatter: () => '',
              textColor: 'rgba(0,0,0,0)',
            }
          : fillLabel,
      shape: {
        fillColor: d => {
          let parentIndex = 0;
          let tempParent: typeof d | typeof d['parent'] = d;
          while (tempParent.parent && tempParent.depth > 0) {
            parentIndex = tempParent.sortIndex;
            tempParent = tempParent.parent;
          }
          return (
            chartTheme.colors!.vizColors?.[parentIndex % chartTheme.colors!.vizColors.length] ||
            chartTheme.colors!.defaultVizColor
          );
        },
      },
    };
  });

  const config: Record<string, unknown> = {
    partitionLayout: shape === 'treemap' ? PartitionLayout.treemap : PartitionLayout.sunburst,
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
  };
  if (shape !== 'treemap') {
    config.emptySizeRatio = shape === 'donut' ? 0.4 : 0;
  }
  if (hideLabels) {
    config.linkLabel = { maxCount: 0 };
  }
  const metricColumn = firstTable.columns.find(c => c.id === metric)!;
  const percentFormatter =
    metricColumn.formatHint && metricColumn.formatHint?.id === 'percent'
      ? formatters[metricColumn.id]
      : props.formatFactory({ id: 'percent' });

  const reverseGroups = columnGroups.reverse();

  const [state, setState] = useState({ isReady: false });
  // It takes a cycle for the chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

  return (
    <VisualizationContainer className="lnsSunburstExpression__container" isReady={state.isReady}>
      <Chart>
        <Partition
          id={shape}
          data={firstTable.rows}
          valueAccessor={(d: Datum) => {
            if (typeof d[metricColumn.id] === 'number') {
              return d[metricColumn.id];
            }
            // Sometimes there is missing data for outer slices
            // When there is missing data, we fall back to the next slices
            // This creates a sunburst effect
            const hasMetric = reverseGroups.find(
              group => group.metrics.length && d[group.metrics[0].id]
            );
            return hasMetric ? d[hasMetric.metrics[0].id] : Number.EPSILON;
          }}
          percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
          valueGetter={hideLabels ? undefined : 'percent'}
          valueFormatter={(d: number) => (hideLabels ? '' : formatters[metricColumn.id].convert(d))}
          // valueFormatter={(d: number) => ''}
          // valueFormatter={(d: number) => formatters[metricColumn.id].convert(d)}
          layers={layers}
          config={config}
        />
      </Chart>
    </VisualizationContainer>
  );
}
