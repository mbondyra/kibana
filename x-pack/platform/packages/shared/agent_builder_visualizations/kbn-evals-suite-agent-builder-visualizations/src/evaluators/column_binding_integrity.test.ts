/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ExtractedVisualization } from '../extract_visualization';
import {
  checkColumnBindings,
  collectColumnBindings,
  createColumnBindingIntegrityEvaluator,
} from './column_binding_integrity';
import { createEsqlQueryRunner } from './esql_query_runner';

const XY: ExtractedVisualization = {
  esql: 'FROM logs | STATS count = COUNT(*), bytes = SUM(bytes) BY response.keyword',
  chartType: 'xy',
  renderer: 'lens',
  visualization: {
    type: 'xy',
    layers: [
      {
        type: 'bar',
        data_source: { type: 'esql', query: 'ignored' },
        x: { column: 'response.keyword' },
        y: [{ column: 'count' }, { column: 'bytes' }],
        breakdown_by: { column: 'host' },
      },
    ],
  },
};

const RESULT_COLUMNS = [
  { name: 'count', type: 'long' },
  { name: 'bytes', type: 'double' },
  { name: 'response.keyword', type: 'keyword' },
];

describe('collectColumnBindings', () => {
  it('collects Lens bindings with their roles and paths, skipping data_source', () => {
    expect(collectColumnBindings(XY)).toEqual([
      { path: 'layers[0].x', column: 'response.keyword', role: 'dimension' },
      { path: 'layers[0].y[0]', column: 'count', role: 'measure' },
      { path: 'layers[0].y[1]', column: 'bytes', role: 'measure' },
      { path: 'layers[0].breakdown_by', column: 'host', role: 'dimension' },
    ]);
  });

  it('collects chart-level metric, group_by, and tag_by bindings', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        visualization: {
          type: 'pie',
          metrics: [{ column: 'c' }],
          group_by: [{ column: 'g' }],
        },
      }).map(({ column, role }) => [column, role])
    ).toEqual([
      ['c', 'measure'],
      ['g', 'dimension'],
    ]);
  });

  it('treats heatmap x and y as axes, not measures', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        chartType: 'heatmap',
        visualization: {
          type: 'heatmap',
          x: { column: 'hour' },
          y: { column: 'response.keyword' },
          metric: { column: 'count' },
        },
      }).map(({ column, role }) => [column, role])
    ).toEqual([
      ['hour', 'dimension'],
      ['response.keyword', 'dimension'],
      ['count', 'measure'],
    ]);
  });

  it('collects Vega encoding fields from the spec string', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            mark: 'point',
            encoding: { x: { field: 'avg' }, y: { field: 'cnt' }, size: { value: 10 } },
          }),
        },
      })
    ).toEqual([
      { path: 'spec.encoding.x', column: 'avg', role: 'other' },
      { path: 'spec.encoding.y', column: 'cnt', role: 'other' },
    ]);
  });

  it('collects encoding fields from layered and concatenated views', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            encoding: { x: { field: 'avg' } },
            layer: [
              { mark: 'point', encoding: { y: { field: 'missing' } } },
              { hconcat: [{ mark: 'bar', encoding: { color: { field: 'host' } } }] },
            ],
          }),
        },
      }).map(({ path, column }) => [path, column])
    ).toEqual([
      ['spec.encoding.x', 'avg'],
      ['spec.layer[0].encoding.y', 'missing'],
      ['spec.layer[1].hconcat[0].encoding.color', 'host'],
    ]);
  });

  it('treats quantitative Vega channels as measures unless they count rows', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            mark: 'point',
            encoding: {
              x: { field: 'host', type: 'nominal' },
              y: { field: 'host', type: 'quantitative', aggregate: 'count' },
              size: { field: 'clientip', type: 'quantitative' },
            },
          }),
        },
      }).map(({ column, role }) => [column, role])
    ).toEqual([
      ['host', 'other'],
      ['host', 'other'],
      ['clientip', 'measure'],
    ]);
  });

  it('collects every field definition of an array-valued channel', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            mark: 'point',
            encoding: {
              x: { field: 'avg' },
              tooltip: [{ field: 'avg' }, { field: 'missing' }, { value: 'static' }],
            },
          }),
        },
      }).map(({ path, column }) => [path, column])
    ).toEqual([
      ['spec.encoding.x', 'avg'],
      ['spec.encoding.tooltip[0]', 'avg'],
      ['spec.encoding.tooltip[1]', 'missing'],
    ]);
  });

  it('reads a dotted Vega field as the flat column name and marks a backslash escape', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            mark: 'bar',
            encoding: {
              x: { field: 'machine\\.os\\.keyword' },
              y: { field: 'machine.os.keyword' },
            },
          }),
        },
      }).map(({ column, escaped }) => [column, escaped])
    ).toEqual([
      ['machine.os.keyword', true],
      ['machine.os.keyword', undefined],
    ]);
  });
});

describe('checkColumnBindings', () => {
  it('flags missing columns and non-numeric measures, tolerating backticks and dotted names', () => {
    const checks = checkColumnBindings(
      [
        { path: 'x', column: '`response.keyword`', role: 'dimension' },
        { path: 'y[0]', column: 'count', role: 'measure' },
        { path: 'y[1]', column: 'response.keyword', role: 'measure' },
        { path: 'breakdown_by', column: 'host', role: 'dimension' },
        { path: 'spec.encoding.x', column: 'response.keyword', role: 'other' },
      ],
      RESULT_COLUMNS
    );

    expect(checks.map(({ path, status }) => [path, status])).toEqual([
      ['x', 'ok'],
      ['y[0]', 'ok'],
      ['y[1]', 'non_numeric_measure'],
      ['breakdown_by', 'missing'],
      ['spec.encoding.x', 'ok'],
    ]);
  });

  it('flags a Vega field that backslash-escapes a result column', () => {
    const checks = checkColumnBindings(
      [
        { path: 'spec.encoding.x', column: 'response.keyword', role: 'other', escaped: true },
        { path: 'spec.encoding.y', column: 'count', role: 'measure' },
      ],
      RESULT_COLUMNS
    );

    expect(checks.map(({ path, status }) => [path, status])).toEqual([
      ['spec.encoding.x', 'escaped_field'],
      ['spec.encoding.y', 'ok'],
    ]);
  });
});

describe('createColumnBindingIntegrityEvaluator', () => {
  const buildEsClient = (columns = RESULT_COLUMNS) =>
    ({
      esql: { query: jest.fn().mockResolvedValue({ columns, values: [] }) },
    } as unknown as ElasticsearchClient);

  const evaluate = (visualizations: ExtractedVisualization[], esClient = buildEsClient()) =>
    createColumnBindingIntegrityEvaluator({
      runQuery: createEsqlQueryRunner(esClient),
      visualizationExtractor: () => visualizations,
    }).evaluate({
      input: { question: 'q' },
      output: { errors: [], messages: [] },
      expected: {},
      metadata: {},
    });

  it('scores the fraction of bindings that resolve and lists the failures', async () => {
    const result = await evaluate([XY]);

    expect(result.score).toBe(0.75);
    expect(result.label).toBe('partial');
    expect(result.explanation).toContain(
      'layers[0].breakdown_by: column "host" is not in the query result'
    );
  });

  it('substitutes bind params before executing', async () => {
    const esClient = buildEsClient();
    await evaluate(
      [{ ...XY, esql: 'FROM logs | WHERE @timestamp >= ?_tstart | STATS count = COUNT(*)' }],
      esClient
    );

    const [[{ query }]] = (esClient.esql.query as jest.Mock).mock.calls;
    expect(query).not.toContain('?_tstart');
  });

  it('scores 0 when the query fails to execute', async () => {
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(new Error('parse error')) },
    } as unknown as ElasticsearchClient;

    const result = await evaluate([XY], esClient);

    expect(result.score).toBe(0);
    expect(result.explanation).toBe(
      '0/4 column binding(s) resolve. ES|QL execution failed: parse error'
    );
  });

  it('scores below 1 when a Vega spec escapes a dotted column name', async () => {
    const result = await evaluate(
      [
        {
          esql: 'FROM logs | STATS count = COUNT(*) BY response.keyword',
          renderer: 'vega',
          visualization: {
            spec: JSON.stringify({
              mark: 'bar',
              encoding: {
                x: { field: 'response\\.keyword', type: 'nominal' },
                y: { field: 'count', type: 'quantitative' },
              },
            }),
          },
        },
      ],
      buildEsClient([
        { name: 'count', type: 'long' },
        { name: 'response.keyword', type: 'keyword' },
      ])
    );

    expect(result.score).toBe(0.5);
    expect(result.label).toBe('partial');
    expect(result.explanation).toContain('response.keyword');
    expect(result.explanation).toContain('backslash-escaped');
  });

  it('scores 1 when a Vega spec uses the dotted column name directly', async () => {
    const result = await evaluate(
      [
        {
          esql: 'FROM logs | STATS count = COUNT(*) BY response.keyword',
          renderer: 'vega',
          visualization: {
            spec: JSON.stringify({
              mark: 'bar',
              encoding: {
                x: { field: 'response.keyword', type: 'nominal' },
                y: { field: 'count', type: 'quantitative' },
              },
            }),
          },
        },
      ],
      buildEsClient([
        { name: 'count', type: 'long' },
        { name: 'response.keyword', type: 'keyword' },
      ])
    );

    expect(result.score).toBe(1);
    expect(result.label).toBe('bound');
  });

  it('scores 0 when no visualization was produced', async () => {
    const result = await evaluate([]);

    expect(result.score).toBe(0);
    expect(result.label).toBe('no-visualization');
  });
});
