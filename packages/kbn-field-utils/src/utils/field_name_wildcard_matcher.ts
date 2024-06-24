/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeRegExp, memoize } from 'lodash';
import levenshtein from 'js-levenshtein';

const makeRegEx = memoize(function makeRegEx(glob: string) {
  const trimmedGlob = glob.trim();
  let globRegex = trimmedGlob
    .split(/[* ]+/) // wildcard or space as a separator
    .map(escapeRegExp)
    .join('.*');

  // the search with spaces is less strict than with wildcard:
  // we allow any start/ending of search results
  if (trimmedGlob.includes(' ')) {
    globRegex = '.*' + globRegex + '.*';
  }

  return new RegExp(globRegex.includes('*') ? `^${globRegex}$` : globRegex, 'i');
});

/**
 * Checks if field displayName or name matches the provided search string.
 * The search string can have wildcard.
 * @param field
 * @param fieldSearchHighlight
 */
export const fieldNameWildcardMatcher = (
  field: { name: string; displayName?: string },
  fieldSearchHighlight: string
): boolean => {
  if (!fieldSearchHighlight?.trim()) {
    return false;
  }

  const regExp = makeRegEx(fieldSearchHighlight);
  const doesWildcardMatch =
    (!!field.displayName && regExp.test(field.displayName)) || regExp.test(field.name);
  if (doesWildcardMatch) {
    return true;
  }
  const distance = getLevensteinDistance(field, fieldSearchHighlight);
  if (distance < 3) {
    return true;
  }
  return false;
};

function getLevensteinDistance(
  field: { name: string; displayName?: string },
  fieldSearchHighlight: string
) {
  if (!fieldSearchHighlight || !field.name) {
    return Infinity;
  }
  const distance = levenshtein(fieldSearchHighlight, field.name);
  return distance;
  console.log('distance', distance, fieldSearchHighlight, field.name);
  // const allSolutions = allPossibilities.reduce((solutions, item) => {
  //   const distance = levenshtein(item, errorText);
  //   if (distance < 3) {
  //     solutions.push(item);
  //   }
  //   return solutions;
  // }, [] as string[]);
  // // filter duplicates
  // return Array.from(new Set(allSolutions));
}

/**
 * Adapts fieldNameWildcardMatcher to combobox props.
 * @param field
 * @param fieldSearchHighlight
 */
export const comboBoxFieldOptionMatcher = ({
  option: { name, label },
  searchValue,
}: {
  option: { name?: string; label: string };
  searchValue: string;
}) => {
  const field = { name: name || label, displayName: label };
  return fieldNameWildcardMatcher(field, searchValue);
};

/**
 * Get `highlight` string to be used together with `EuiHighlight`
 * @param displayName
 * @param fieldSearchHighlight
 */
export function getFieldSearchMatchingHighlight(
  displayName: string,
  fieldSearchHighlight?: string
): string {
  const searchHighlight = (fieldSearchHighlight || '').trim();
  if (
    (searchHighlight.includes('*') || searchHighlight.includes(' ')) &&
    fieldNameWildcardMatcher({ name: displayName }, searchHighlight)
  ) {
    return displayName;
  }

  return searchHighlight;
}
