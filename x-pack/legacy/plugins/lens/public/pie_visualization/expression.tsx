/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Chart, Datum, Partition, getSpecId } from '@elastic/charts';
import {
  ExpressionFunction,
  KibanaDatatable,
} from '../../../../../../src/plugins/expressions/common';
import { LensMultiTable } from '../types';
import {
  IInterpreterRenderFunction,
  IInterpreterRenderHandlers,
} from '../../../../../../src/plugins/expressions/public';
import { FormatFactory } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';
import { VisualizationContainer } from '../visualization_container';

export interface PieColumns {
  columnIds: string[];
}

interface Args {
  columns: PieColumns;
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

export const pie: ExpressionFunction<'lens_pie', KibanaDatatable, Args, PieRender> = ({
  name: 'lens_pie',
  type: 'render',
  help: i18n.translate('xpack.lens.pie.expressionHelpLabel', {
    defaultMessage: 'Pie renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.datatable.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    columns: {
      types: ['lens_pie_columns'],
      help: '',
    },
  },
  context: {
    types: ['lens_multitable'],
  },
  fn(data: KibanaDatatable, args: Args) {
    return {
      type: 'render',
      as: 'lens_pie_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<'lens_pie', KibanaDatatable, Args, PieRender>;

type PieColumnsResult = PieColumns & { type: 'lens_pie_columns' };

export const pieColumns: ExpressionFunction<
  'lens_pie_columns',
  null,
  PieColumns,
  PieColumnsResult
> = {
  name: 'lens_pie_columns',
  aliases: [],
  type: 'lens_pie_columns',
  help: '',
  context: {
    types: ['null'],
  },
  args: {
    columnIds: {
      types: ['string'],
      multi: true,
      help: '',
    },
  },
  fn: function fn(_context: unknown, args: PieColumns) {
    return {
      type: 'lens_pie_columns',
      ...args,
    };
  },
};

export const getPieRenderer = (
  formatFactory: FormatFactory
): IInterpreterRenderFunction<PieProps> => ({
  name: 'lens_pie_renderer',
  displayName: i18n.translate('xpack.lens.pie.visualizationName', {
    defaultMessage: 'Pie',
  }),
  help: '',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: PieProps, handlers: IInterpreterRenderHandlers) => {
    ReactDOM.render(<PieComponent {...config} formatFactory={formatFactory} />, domNode, () => {
      handlers.done();
    });
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

function PieComponent(props: PieProps & { formatFactory: FormatFactory }) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  firstTable.columns.forEach(column => {
    formatters[column.id] = props.formatFactory(column.formatHint);
  });

  return (
    <VisualizationContainer className="lnsSunburstExpression__container">
      <Chart>
        <Partition
          id={getSpecId('pie')}
          data={firstTable.rows}
          valueAccessor={(d: Datum) => d[firstTable.columns[firstTable.columns.length - 1].id]}
          valueFormatter={(d: number) =>
            formatters[firstTable.columns[firstTable.columns.length - 1].id].convert(d)
          }
          layers={[
            {
              groupByRollup: (d: Datum) => d[firstTable.columns[0].id],
              nodeLabel: (d: Datum) => d[firstTable.columns[0].name],
              fillLabel: { textInvertible: true },
              shape: {
                fillColor: 'blue',
              },
            },
          ]}
        />
      </Chart>
    </VisualizationContainer>
  );
}
