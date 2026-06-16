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

  it('validates a by-value panel with a spec object', () => {
    expect(() =>
      vegaSchema.validate({
        spec: { $schema: 'https://vega.github.io/schema/vega-lite/v5.json', mark: 'bar' },
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
    expect(() => vegaSchema.validate({ spec: {}, savedVis: {} })).toThrow();
  });

  // The dashboard read path (`transformPanel`) and the `sanitize` endpoint validate panel
  // configs with `stripUnknownKeys: true` rather than rejecting unknown keys. A Vega panel
  // must survive that validation with its `spec` and mapped properties intact, otherwise the
  // panel is dropped from the sanitized dashboard. See `stripUnmappedKeys` / `transformPanelsOut`.
  describe('dashboard read / sanitize validation (stripUnknownKeys)', () => {
    const validateLikeDashboard = (config: object) =>
      vegaSchema.validate(config, undefined, undefined, { stripUnknownKeys: true });

    it('keeps a by-value Vega panel and preserves its mapped properties and nested spec', () => {
      const config = {
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          mark: 'bar',
          encoding: { x: { field: 'a' } },
        },
        title: 'My Vega chart',
        description: 'A description',
        time_range: { from: 'now-15m', to: 'now' },
      };

      expect(validateLikeDashboard(config)).toEqual(config);
    });

    it('strips unknown keys instead of dropping the panel', () => {
      const validated = validateLikeDashboard({
        spec: { mark: 'line' },
        title: 'My Vega chart',
        savedVis: { type: 'vega' },
      });

      expect(validated).toEqual({ spec: { mark: 'line' }, title: 'My Vega chart' });
      expect(validated).not.toHaveProperty('savedVis');
    });

    it('keeps a by-reference Vega panel', () => {
      const config = { ref_id: 'abc-123', title: 'Saved Vega chart' };

      expect(validateLikeDashboard(config)).toEqual(config);
    });
  });
});
