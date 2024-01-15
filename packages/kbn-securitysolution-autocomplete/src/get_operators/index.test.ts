/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  doesNotExistOperator,
  EVENT_FILTERS_OPERATORS,
  ALL_OPERATORS,
  existsOperator,
  doesNotEqualOperator,
  equalsOperator,
} from '@kbn/securitysolution-list-utils';
import { getOperators } from '.';
import { getField } from '../fields/index.mock';

describe('#getOperators', () => {
  test('it returns "equalsOperator" if passed in field is "undefined"', () => {
    const operator = getOperators(undefined);

    expect(operator).toEqual([equalsOperator]);
  });

  test('it returns expected operators when field type is "boolean"', () => {
    const operator = getOperators(getField('ssl'));

    expect(operator).toEqual([
      equalsOperator,
      doesNotEqualOperator,
      existsOperator,
      doesNotExistOperator,
    ]);
  });

  test('it returns "equalsOperator" when field type is "nested"', () => {
    const operator = getOperators({
      name: 'nestedField',
      scripted: false,
      subType: { nested: { path: 'nestedField' } },
      type: 'nested',
    });

    expect(operator).toEqual([equalsOperator]);
  });

  test('it includes a "matches" operator when field is "file.path.text"', () => {
    const operator = getOperators({
      name: 'file.path.text',
      type: 'simple',
    });

    expect(operator).toEqual(EVENT_FILTERS_OPERATORS);
  });

  test('it returns all operator types when field type is not null, boolean, or nested', () => {
    const operator = getOperators(getField('machine.os.raw'));

    expect(operator).toEqual(ALL_OPERATORS);
  });
});
