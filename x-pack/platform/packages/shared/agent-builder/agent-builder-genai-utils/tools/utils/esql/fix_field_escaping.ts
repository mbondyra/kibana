/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeEsqlColumnName } from '@kbn/esql-utils';
import type { MappingFieldWithStats } from '../sampling';

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const IDENT_CHARS = '[\\w.`]';
const IDENTIFIER_BOUNDARY = (pattern: string) =>
  new RegExp(`(?<!${IDENT_CHARS})${pattern}(?!${IDENT_CHARS})`, 'g');

/**
 * Fixes unescaped field names in an ES|QL query using the known resource fields.
 * For each field whose path requires backtick-quoting, replaces unescaped occurrences
 * in the query with the properly escaped form.
 */
export const fixEsqlFieldEscaping = (query: string, fields: MappingFieldWithStats[]): string => {
  const toFix = fields
    .map((f) => [f.path, escapeEsqlColumnName(f.path)] as const)
    .filter(([raw, escaped]) => raw !== escaped);

  return toFix.reduce((q, [raw, escaped]) => {
    const pattern = raw.replace(REGEX_SPECIAL_CHARS, '\\$&');
    return q.replace(IDENTIFIER_BOUNDARY(pattern), escaped);
  }, query);
};
