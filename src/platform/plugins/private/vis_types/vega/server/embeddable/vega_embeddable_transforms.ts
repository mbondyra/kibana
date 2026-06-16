/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import hjson from 'hjson';
import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import {
  convertCamelCasedKeysToSnakeCase,
  transformTimeRangeOut,
  transformTitlesOut,
} from '@kbn/presentation-publishing';
import { VEGA_VIS_TYPE } from '../../common/constants';
import type { VegaEmbeddableState } from './vega_embeddable_schema';

interface LegacyVegaStoredState {
  savedVis?: {
    type?: string;
    params?: { spec?: string };
  };
}

/**
 * The dedicated Vega embeddable models the spec as a JSON object. Legacy specs are stored as HJSON
 * strings, so parse them (HJSON is a superset of JSON; this also handles plain JSON). An object spec
 * is returned as-is.
 */
const parseSpec = (spec: unknown): Record<string, unknown> => {
  if (typeof spec === 'string') {
    return hjson.parse(spec, { legacyRoot: false });
  }
  return (spec as Record<string, unknown>) ?? {};
};

/**
 * Legacy by-value Vega panels are stored as generic `visualization` embeddables, nesting the spec
 * inside `savedVis.params.spec`. Hoist the spec to the top level (as a JSON object) so the stored
 * state matches the dedicated Vega embeddable's flat `{ spec }` shape. Native Vega panels (already
 * flat) pass through unchanged.
 */
const hoistSpecFromSavedVis = (storedState: object): object => {
  const { savedVis, ...rest } = storedState as LegacyVegaStoredState & Record<string, unknown>;
  if (savedVis?.type === VEGA_VIS_TYPE) {
    return { ...rest, spec: parseSpec(savedVis.params?.spec) };
  }
  return storedState;
};

export const getVegaEmbeddableTransformOut =
  (transformDrilldownsOut: DrilldownTransforms['transformOut']) =>
  (storedState: object, panelReferences?: Reference[]): VegaEmbeddableState => {
    const transformsFlow = flow(
      hoistSpecFromSavedVis,
      transformTitlesOut,
      transformTimeRangeOut,
      (state: object) => transformDrilldownsOut(state, panelReferences),
      // snake case last as snake casing may affect other transforms
      // BWC transforms may be looking for original camel cased keys
      convertCamelCasedKeysToSnakeCase
    );
    return transformsFlow(storedState) as VegaEmbeddableState;
  };

export const getVegaEmbeddableTransforms = (drilldownTransforms: DrilldownTransforms) => ({
  transformIn: (state: VegaEmbeddableState) => drilldownTransforms.transformIn(state),
  transformOut: getVegaEmbeddableTransformOut(drilldownTransforms.transformOut),
});
