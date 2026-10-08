/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';

const DEFAULT_TIME_FIELD = '@timestamp';
const DATE_TYPES = ['date', 'date_nanos'];

/**
 * Date fields one of which a query on `index` must bind to `?_tstart`/`?_tend`.
 *
 * Kibana resolves the time field from the query, falling back to `@timestamp`.
 * Empty when that fallback applies or the index has no date field; then any
 * query respects the time picker.
 */
export const findTimeFieldCandidates = async ({
  esClient,
  index,
}: {
  esClient: IScopedClusterClient;
  index: string;
}): Promise<string[]> => {
  const { fields } = await esClient.asCurrentUser.fieldCaps({
    index,
    fields: '*',
    types: DATE_TYPES,
    include_unmapped: false,
  });
  // The response also lists the object parents of nested date fields.
  const dateFields = Object.entries(fields)
    .filter(([, capabilities]) => DATE_TYPES.some((type) => type in capabilities))
    .map(([name]) => name);

  return dateFields.includes(DEFAULT_TIME_FIELD) ? [] : dateFields;
};

const formatCandidates = (candidates: readonly string[]): string =>
  candidates.map((field) => `\`${field}\``).join(', ');

const describeBinding = (candidates: readonly string[]): string =>
  `bind its event-time field (one of ${formatCandidates(
    candidates
  )}) to the time picker: \`BUCKET(<field>, 100, ?_tstart, ?_tend)\` when charting over time, otherwise \`WHERE <field> >= ?_tstart AND <field> < ?_tend\` before \`STATS\``;

export const buildTimeFieldInstructions = (
  index: string,
  candidates: readonly string[]
): string => `
## Time field (required)

\`${index}\` has no \`@timestamp\`, so Kibana applies the time picker only through the date field the query binds to \`?_tstart\` / \`?_tend\`. Every query must ${describeBinding(
  candidates
)}. Use the source field itself, never a \`RENAME\` or \`EVAL\` alias.`;

/** Error for a query that leaves the time picker unapplied; undefined when it binds a candidate. */
export const findTimeFieldError = (
  query: string | undefined,
  candidates: readonly string[]
): string | undefined => {
  if (!query || candidates.length === 0) {
    return undefined;
  }
  const timeField = parseTimeFieldFromESQLQuery(query);
  if (timeField && candidates.includes(timeField)) {
    return undefined;
  }
  return `The query ignores the time picker. The index has no @timestamp, so the query must ${describeBinding(
    candidates
  )}.`;
};
