/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeVegaFieldReferences, unescapeEsqlQuery } from './field_escaping';

describe('escapeVegaFieldReferences', () => {
  it('escapes dots in a field reference', () => {
    const spec = { encoding: { x: { field: 'response.keyword', type: 'nominal' } } };

    expect(escapeVegaFieldReferences(spec)).toEqual({
      encoding: { x: { field: 'response\\.keyword', type: 'nominal' } },
    });
  });

  it('leaves a query dotted name raw, including one that arrived escaped', () => {
    const spec = {
      data: {
        url: {
          query: 'FROM logs | WHERE response\\.keyword != "403" AND host.name == "a"',
        },
      },
      facet: { field: 'response.keyword' },
    };

    expect(escapeVegaFieldReferences(spec)).toEqual({
      data: {
        url: {
          query: 'FROM logs | WHERE response.keyword != "403" AND host.name == "a"',
        },
      },
      facet: { field: 'response\\.keyword' },
    });
  });

  it('does not double-escape an already escaped field', () => {
    const spec = { encoding: { x: { field: 'host\\.name' } } };

    expect(escapeVegaFieldReferences(spec)).toEqual(spec);
  });

  it('escapes fields nested inside arrays such as tooltip', () => {
    const spec = {
      encoding: {
        tooltip: [{ field: 'service.name' }, { field: 'duration' }],
      },
    };

    expect(escapeVegaFieldReferences(spec)).toEqual({
      encoding: {
        tooltip: [{ field: 'service\\.name' }, { field: 'duration' }],
      },
    });
  });
});

describe('unescapeEsqlQuery', () => {
  it('removes backslashes that were added in front of dots', () => {
    expect(unescapeEsqlQuery('WHERE response\\.keyword != "403"')).toBe(
      'WHERE response.keyword != "403"'
    );
  });
});
