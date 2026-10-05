/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Vega-Lite reads an unescaped dot in a `field` as nested access. ES|QL columns
 * are flat, so `response.keyword` must be stored as `response\.keyword`.
 * The ES|QL query uses the raw name; a backslash there is invalid.
 */

// A dot that is not already escaped with a preceding backslash.
const UNESCAPED_DOT = /(?<!\\)\./g;
// A backslash that was inserted in front of a dot. Queries must not keep these.
const ESCAPED_DOT = /\\\./g;

const escapeFieldName = (name: string): string => name.replace(UNESCAPED_DOT, '\\.');

/** Drop Vega field-escapes from an ES|QL query. The query uses raw field names. */
export const unescapeEsqlQuery = (query: string): string => query.replace(ESCAPED_DOT, '.');

/**
 * Escape dots in every Vega `field` and strip the same escapes from every
 * `query` string. Returns a new object; the input is not mutated.
 */
export const escapeVegaFieldReferences = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => escapeVegaFieldReferences(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'field' && typeof item === 'string') {
        result[key] = escapeFieldName(item);
      } else if (key === 'query' && typeof item === 'string') {
        result[key] = unescapeEsqlQuery(item);
      } else {
        result[key] = escapeVegaFieldReferences(item);
      }
    }
    return result as T;
  }

  return value;
};
