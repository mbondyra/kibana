/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getVegaEmbeddableSchema } from './vega_embeddable_schema';

describe('vega embeddable schema', () => {
  const vegaSchema = getVegaEmbeddableSchema(mockGetDrilldownsSchema);

  it('validates a by-value panel with a spec', () => {
    expect(() =>
      vegaSchema.validate({
        spec: '{ "$schema": "https://vega.github.io/schema/vega-lite/v5.json" }',
        title: 'My Vega chart',
      })
    ).not.toThrow();
  });

  it('validates a by-reference panel with a ref_id', () => {
    expect(() => vegaSchema.validate({ ref_id: 'abc-123' })).not.toThrow();
  });

  it('rejects a by-value panel without a spec', () => {
    expect(() => vegaSchema.validate({ title: 'no spec' })).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => vegaSchema.validate({ spec: '{}', savedVis: {} })).toThrow();
  });
});
