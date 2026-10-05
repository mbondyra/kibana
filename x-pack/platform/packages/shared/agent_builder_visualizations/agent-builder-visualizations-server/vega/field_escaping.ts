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
// A backslash-escaped dot.
const ESCAPED_DOT = /\\\./g;

const TRIPLE_QUOTE = '"""';

/**
 * Transform properties whose string (or string array) values are field names.
 * They are matched only inside a `transform` entry, because names such as `key`
 * or `value` mean something else elsewhere in a spec.
 */
const TRANSFORM_FIELD_KEYS: ReadonlySet<string> = new Set([
  'groupby',
  'pivot',
  'fold',
  'flatten',
  'density',
  'loess',
  'regression',
  'on',
  'stack',
  'extent',
  'quantile',
  'impute',
  'key',
  'lookup',
]);

// The pivot transform's `value` is a field; in `impute` it is a fill constant.
const isTransformFieldKey = (transform: Record<string, unknown>, key: string): boolean =>
  TRANSFORM_FIELD_KEYS.has(key) || (key === 'value' && 'pivot' in transform);

const escapeFieldName = (name: string): string => name.replace(UNESCAPED_DOT, '\\.');
const unescapeFieldName = (name: string): string => name.replace(ESCAPED_DOT, '.');

const escapeFieldNames = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return escapeFieldName(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? escapeFieldName(item) : item));
  }
  return value;
};

/**
 * Drop Vega field-escapes (`response\.keyword`) from an ES|QL query. String
 * literals are left untouched, because a `\.` there is part of a regex or
 * pattern (`RLIKE """.*\.php"""`).
 */
export const unescapeEsqlQuery = (query: string): string => {
  let result = '';
  let index = 0;

  while (index < query.length) {
    if (query.startsWith(TRIPLE_QUOTE, index)) {
      const close = query.indexOf(TRIPLE_QUOTE, index + TRIPLE_QUOTE.length);
      const end = close === -1 ? query.length : close + TRIPLE_QUOTE.length;
      result += query.slice(index, end);
      index = end;
    } else if (query[index] === '"') {
      let end = index + 1;
      while (end < query.length && query[end] !== '"') {
        end += query[end] === '\\' ? 2 : 1;
      }
      end = Math.min(end + 1, query.length);
      result += query.slice(index, end);
      index = end;
    } else if (query[index] === '\\' && query[index + 1] === '.') {
      result += '.';
      index += 2;
    } else {
      result += query[index];
      index += 1;
    }
  }

  return result;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * Output names Vega-Lite derives from the input fields when `as` is omitted.
 * Escaping the input would leak the backslash into those names, so they are
 * pinned to the raw column names first.
 */
const defaultOutputNames = (transform: Record<string, unknown>): string[] | undefined => {
  const { flatten, loess, regression, on } = transform;
  if (isStringArray(flatten)) {
    return flatten.map(unescapeFieldName);
  }
  const fitted = loess ?? regression;
  if (typeof on === 'string' && typeof fitted === 'string') {
    return [unescapeFieldName(on), unescapeFieldName(fitted)];
  }
  return undefined;
};

const escapeTransform = (transform: unknown): unknown => {
  if (!transform || typeof transform !== 'object' || Array.isArray(transform)) {
    return escapeVegaFieldReferences(transform);
  }
  const result: Record<string, unknown> = {};
  const entry = transform as Record<string, unknown>;
  const outputNames = entry.as === undefined ? defaultOutputNames(entry) : undefined;
  for (const [key, item] of Object.entries(entry)) {
    result[key] = isTransformFieldKey(entry, key)
      ? escapeFieldNames(item)
      : escapeVegaFieldReferences(item);
  }
  if (outputNames) {
    result.as = outputNames;
  }
  return result;
};

/**
 * Escape dots in every Vega field reference (`field` and field-valued transform
 * params such as `groupby`) and strip the same escapes from every `query`
 * string. Returns a new object; the input is not mutated.
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
      } else if (key === 'transform' && Array.isArray(item)) {
        result[key] = item.map(escapeTransform);
      } else {
        result[key] = escapeVegaFieldReferences(item);
      }
    }
    return result as T;
  }

  return value;
};
