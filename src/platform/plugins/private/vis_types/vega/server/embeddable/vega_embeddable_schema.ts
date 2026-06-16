/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS } from '../../common/constants';

// Vega/Vega-Lite specs are large, arbitrary JSON objects, so model the spec as an open record
// rather than a string. `recordOf` keeps the nested keys intact through `stripUnknownKeys`
// validation and preserves by-value vs by-reference discrimination in the `oneOf` below.
const specSchema = schema.recordOf(schema.string(), schema.any(), {
  meta: {
    description: 'The Vega or Vega-Lite specification, as a JSON object.',
  },
});

const getByValueSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.object(
    {
      spec: specSchema,
      ...serializedTitlesSchema.getPropSchemas(),
      ...serializedTimeRangeSchema.getPropSchemas(),
      ...getDrilldownsSchema(VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS).getPropSchemas(),
    },
    { meta: BY_VALUE_SCHEMA_META }
  );

const getByReferenceSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.object(
    {
      ref_id: schema.string({
        meta: { description: 'The ID of the saved Vega visualization.' },
      }),
      ...serializedTitlesSchema.getPropSchemas(),
      ...serializedTimeRangeSchema.getPropSchemas(),
      ...getDrilldownsSchema(VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS).getPropSchemas(),
    },
    { meta: BY_REF_SCHEMA_META }
  );

export const getVegaEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.oneOf([getByValueSchema(getDrilldownsSchema), getByReferenceSchema(getDrilldownsSchema)], {
    meta: { description: 'Vega visualization embeddable schema' },
  });

export type VegaByValueState = TypeOf<ReturnType<typeof getByValueSchema>>;
export type VegaByReferenceState = TypeOf<ReturnType<typeof getByReferenceSchema>>;
export type VegaEmbeddableState = TypeOf<ReturnType<typeof getVegaEmbeddableSchema>>;
