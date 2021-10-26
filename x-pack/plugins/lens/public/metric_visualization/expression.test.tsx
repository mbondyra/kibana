/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricChart } from './expression';
import { MetricConfig, metricChart } from '../../common/expressions';
import React from 'react';
import { shallow } from 'enzyme';
import { createMockExecutionContext } from '../../../../../src/plugins/expressions/common/mocks';
import type { IFieldFormat } from '../../../../../src/plugins/field_formats/common';
import { layerTypes } from '../../common';
import type { LensMultiTable } from '../../common';
import { IUiSettingsClient } from 'kibana/public';
import { ColorMode } from 'src/plugins/charts/common';

function sampleArgs() {
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      l1: {
        type: 'datatable',
        columns: [
          // Simulating a calculated column like a formula
          { id: 'a', name: 'a', meta: { type: 'string', params: { id: 'string' } } },
          { id: 'b', name: 'b', meta: { type: 'string' } },
          {
            id: 'c',
            name: 'c',
            meta: { type: 'number', params: { id: 'percent', params: { format: '0.000%' } } },
          },
        ],
        rows: [{ a: 'last', b: 'last', c: 3 }],
      },
    },
  };

  const args: MetricConfig = {
    accessor: 'c',
    layerId: 'l1',
    layerType: layerTypes.DATA,
    title: 'My fanci metric chart',
    description: 'Fancy chart description',
    metricTitle: 'My fanci metric chart',
    mode: 'full',
    colorMode: ColorMode.None,
    palette: { type: 'palette', name: 'status' },
  };

  const noAttributesArgs: MetricConfig = {
    accessor: 'c',
    layerId: 'l1',
    layerType: layerTypes.DATA,
    title: '',
    description: '',
    metricTitle: 'My fanci metric chart',
    mode: 'full',
    colorMode: ColorMode.None,
    palette: { type: 'palette', name: 'status' },
  };

  return { data, args, noAttributesArgs };
}

describe('metric_expression', () => {
  describe('metricChart', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();
      const result = metricChart.fn(data, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'render',
        as: 'lens_metric_chart_renderer',
        value: { data, args },
      });
    });
  });

  describe('MetricChart component', () => {
    test('it renders all attributes when passed (title, description, metricTitle, value)', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={data}
            args={args}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription="Fancy chart description"
          reportTitle="My fanci metric chart"
        >
          <AutoScale
            key="3"
          >
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              3
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it renders strings', () => {
      const { data, args } = sampleArgs();
      args.accessor = 'a';

      expect(
        shallow(
          <MetricChart
            data={data}
            args={args}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription="Fancy chart description"
          reportTitle="My fanci metric chart"
        >
          <AutoScale
            key="last"
          >
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              last
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it renders only chart content when title and description are empty strings', () => {
      const { data, noAttributesArgs } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={data}
            args={noAttributesArgs}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <AutoScale
            key="3"
          >
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              3
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it does not render metricTitle in reduced mode', () => {
      const { data, noAttributesArgs } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={data}
            args={{ ...noAttributesArgs, mode: 'reduced' }}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <AutoScale
            key="3"
          >
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              3
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it renders an EmptyPlaceholder when no tables is passed as data', () => {
      const { data, noAttributesArgs } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={{ ...data, tables: {} }}
            args={noAttributesArgs}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <EmptyPlaceholder
            icon={[Function]}
          />
        </VisualizationContainer>
      `);
    });

    test('it renders an EmptyPlaceholder when null value is passed as data', () => {
      const { data, noAttributesArgs } = sampleArgs();

      data.tables.l1.rows[0].c = null;

      expect(
        shallow(
          <MetricChart
            data={data}
            args={noAttributesArgs}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <EmptyPlaceholder
            icon={[Function]}
          />
        </VisualizationContainer>
      `);
    });

    test('it renders 0 value', () => {
      const { data, noAttributesArgs } = sampleArgs();

      data.tables.l1.rows[0].c = 0;

      expect(
        shallow(
          <MetricChart
            data={data}
            args={noAttributesArgs}
            formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
            uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <AutoScale
            key="0"
          >
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              0
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it finds the right column to format', () => {
      const { data, args } = sampleArgs();
      const factory = jest.fn(() => ({ convert: (x) => x } as IFieldFormat));

      shallow(
        <MetricChart
          data={data}
          args={args}
          formatFactory={factory}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        />
      );
      expect(factory).toHaveBeenCalledWith({ id: 'percent', params: { format: '0.000%' } });
    });

    test('it renders the correct color styling for numeric value if coloring config is passed with default palette', () => {
      const { data, args } = sampleArgs();

      args.colorMode = ColorMode.Background;
      args.palette.params = {
        rangeMin: 0,
        rangeMax: 100,
        stops: [],
        gradient: false,
        range: 'number',
        colors: ['red', 'yellow', 'green'],
      };

      const instance = shallow(
        <MetricChart
          data={data}
          args={args}
          formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        />
      );

      expect(instance.find('[data-test-subj="lns_metric_value"]').first().prop('style')).toEqual(
        expect.objectContaining({
          backgroundColor: 'yellow',
          color: expect.any(String),
        })
      );
    });

    test('it renders the correct color styling for numeric value if coloring config is passed', () => {
      const { data, args } = sampleArgs();

      args.colorMode = ColorMode.Labels;
      args.palette.params = {
        rangeMin: 0,
        rangeMax: 400,
        stops: [100, 200, 400],
        gradient: false,
        range: 'number',
        colors: ['red', 'yellow', 'green'],
      };

      const instance = shallow(
        <MetricChart
          data={data}
          args={args}
          formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        />
      );

      expect(instance.find('[data-test-subj="lns_metric_value"]').first().prop('style')).toEqual(
        expect.objectContaining({
          color: 'red',
        })
      );
    });
  });
});
