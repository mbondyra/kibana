/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEsqlFromSpec } from './recover_esql';

const ESQL = 'FROM logs-* | STATS count = COUNT(*) BY region';

describe('extractEsqlFromSpec', () => {
  it('recovers the ES|QL query from a serialized normalized spec', () => {
    const spec = JSON.stringify({
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      mark: 'bar',
      data: { url: { '%type%': 'esql', query: ESQL } },
    });

    expect(extractEsqlFromSpec(spec)).toBe(ESQL);
  });

  it('recovers the ES|QL query from an already-parsed spec object', () => {
    expect(extractEsqlFromSpec({ data: { url: { '%type%': 'esql', query: ESQL } } })).toBe(ESQL);
  });

  it('returns undefined when the data source is not an ES|QL binding', () => {
    expect(extractEsqlFromSpec({ mark: 'bar' })).toBeUndefined();
    expect(
      extractEsqlFromSpec({ data: { url: { '%type%': 'index', query: ESQL } } })
    ).toBeUndefined();
    expect(extractEsqlFromSpec({ data: { values: [{ a: 1 }] } })).toBeUndefined();
  });

  it('recovers the query when the spec JSON has a trailing comma', () => {
    // A stored spec can fail JSON.parse (trailing comma) and then an edit
    // regenerates ES|QL from scratch, dropping the aggregation.
    const spec = `{
      "data": {
        "url": {
          "%type%": "esql",
          "query": "FROM kibana_sample_data_logs | STATS count = COUNT(*) BY bucket = TBUCKET(100, ?_tstart, ?_tend), \`response.keyword\`",
        }
      }
    }`;

    expect(extractEsqlFromSpec(spec)).toBe(
      'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY bucket = TBUCKET(100, ?_tstart, ?_tend), `response.keyword`'
    );
  });

  it('returns undefined for empty, malformed, or blank-query input', () => {
    expect(extractEsqlFromSpec(undefined)).toBeUndefined();
    expect(extractEsqlFromSpec(null)).toBeUndefined();
    expect(extractEsqlFromSpec('not json')).toBeUndefined();
    expect(
      extractEsqlFromSpec({ data: { url: { '%type%': 'esql', query: '   ' } } })
    ).toBeUndefined();
  });
});
