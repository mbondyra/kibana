/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UNQUOTED_DOTTED_PATH =
  /(?:^|[^A-Za-z0-9_@.])([A-Za-z0-9_@][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)(?=$|[^A-Za-z0-9_])/g;

// Exclude numeric literals matched as dotted paths.
const NUMERIC_LITERAL = /^\d+(?:\.\d+)+(?:[eE][+-]?\d*)?$/;

/** Checks for unescaped digit-leading segments in dotted field paths. */
export const hasUnescapedDigitLeadingFieldSegment = (query: string | undefined): boolean => {
  if (!query) {
    return false;
  }

  const unquotedQuery = query.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:``|[^`])*`/g, ' ');

  return Array.from(unquotedQuery.matchAll(UNQUOTED_DOTTED_PATH), (match) => match[1]).some(
    (path) => !NUMERIC_LITERAL.test(path) && path.split('.').some((segment) => /^\d/.test(segment))
  );
};
