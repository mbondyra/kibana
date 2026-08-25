/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';

/** A named project routing expression (NPRE) stored as `@{name}` in `project_routing`. */
export interface NamedProjectRouting {
  /** The `@name` reference as stored on the saved object / request. */
  reference: string;
  /** Evaluated Lucene expression, when Kibana was able to resolve the NPRE. */
  evaluatedValue?: string;
}

const NAMED_REFERENCE_PATTERN = /^@[^\s@]+$/;

const EVALUATED_VALUE_TOOLTIP_MAX_LENGTH = 120;

/**
 * True when `routing` is a named project routing reference (`@my-expr`).
 * Blank, `@`, and Lucene expressions are not named references.
 */
export const isNamedProjectRouting = (routing: ProjectRouting | undefined): boolean =>
  getNamedProjectRoutingReference(routing) !== undefined;

/**
 * Returns the trimmed `@name` reference, or `undefined` when `routing` is not a named reference.
 */
export const getNamedProjectRoutingReference = (
  routing: ProjectRouting | undefined
): string | undefined => {
  const trimmed = routing?.trim();
  if (!trimmed || !NAMED_REFERENCE_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed;
};

/**
 * Elasticsearch NPRE name (no leading `@`) for `/_project_routing/{name}` lookups.
 */
export const getNamedProjectRoutingName = (reference: string): string | undefined => {
  const trimmed = reference.trim();
  const name = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return name.length > 0 ? name : undefined;
};

/**
 * Truncates an evaluated NPRE value for compact UI display.
 */
export const truncateNamedProjectRoutingValue = (
  value: string,
  maxLength = EVALUATED_VALUE_TOOLTIP_MAX_LENGTH
): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
};
