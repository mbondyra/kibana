/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { getVegaEmbeddableTransforms } from './vega_embeddable_transforms';

// Identity drilldown transforms so we can assert the Vega-specific behavior in isolation.
const drilldownTransforms = {
  transformIn: (state: object) => ({ state }),
  transformOut: (state: object) => state,
} as unknown as DrilldownTransforms;

describe('vega embeddable transforms', () => {
  const { transformOut } = getVegaEmbeddableTransforms(drilldownTransforms);

  it('hoists and parses the spec out of a legacy by-value visualization (savedVis)', () => {
    const stored = {
      savedVis: {
        type: 'vega',
        title: 'inner vis title',
        // HJSON spec string (comments, unquoted keys) as authored in the legacy editor
        params: { spec: '{\n  // a bar chart\n  mark: "bar"\n}' },
        uiState: {},
        data: { aggs: [] as unknown[], searchSource: {} },
      },
      title: 'My Vega panel',
      time_range: { from: 'now-15m', to: 'now' },
    };

    const result = transformOut(stored);

    expect(result).toEqual({
      spec: { mark: 'bar' },
      title: 'My Vega panel',
      time_range: { from: 'now-15m', to: 'now' },
    });
    expect(result).not.toHaveProperty('savedVis');
  });

  it('passes through a native flat Vega state with an object spec', () => {
    const stored = {
      spec: { mark: 'line' },
      title: 'Native Vega',
      hide_title: false,
    };

    expect(transformOut(stored)).toEqual(stored);
  });

  it('does not hoist a non-Vega legacy visualization', () => {
    const stored = {
      savedVis: { type: 'markdown', params: { markdown: 'hello' } },
      title: 'Not Vega',
    };

    const result = transformOut(stored);

    expect(result).not.toHaveProperty('spec');
  });
});
