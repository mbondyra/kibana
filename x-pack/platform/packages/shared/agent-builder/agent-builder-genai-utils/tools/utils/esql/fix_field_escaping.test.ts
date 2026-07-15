/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fixEsqlFieldEscaping } from './fix_field_escaping';
import type { MappingFieldWithStats } from '../sampling';

const field = (path: string): MappingFieldWithStats =>
  ({ path, type: 'double', meta: {}, stats: { values: [] }, tsDimension: false } as unknown as MappingFieldWithStats);

describe('fixEsqlFieldEscaping', () => {
  it('escapes a digit-leading last segment', () => {
    const query =
      'TS metrics | STATS AVG(AVG_OVER_TIME(system.cpu.load_average.1m))';
    const result = fixEsqlFieldEscaping(query, [field('system.cpu.load_average.1m')]);
    expect(result).toBe(
      'TS metrics | STATS AVG(AVG_OVER_TIME(system.cpu.load_average.`1m`))'
    );
  });

  it('escapes multiple digit-leading fields in one pass', () => {
    const query =
      'STATS AVG(AVG_OVER_TIME(system.cpu.load_average.1m)), AVG(AVG_OVER_TIME(system.cpu.load_average.5m))';
    const result = fixEsqlFieldEscaping(query, [
      field('system.cpu.load_average.1m'),
      field('system.cpu.load_average.5m'),
    ]);
    expect(result).toBe(
      'STATS AVG(AVG_OVER_TIME(system.cpu.load_average.`1m`)), AVG(AVG_OVER_TIME(system.cpu.load_average.`5m`))'
    );
  });

  it('does not touch fields that do not need escaping', () => {
    const query = 'FROM index | KEEP system.cpu.usage';
    const result = fixEsqlFieldEscaping(query, [field('system.cpu.usage')]);
    expect(result).toBe(query);
  });

  it('does not replace already backtick-quoted occurrences', () => {
    const query = 'TS metrics | STATS AVG(AVG_OVER_TIME(`system.cpu.load_average.1m`))';
    const result = fixEsqlFieldEscaping(query, [field('system.cpu.load_average.1m')]);
    expect(result).toBe(query);
  });

  it('returns the query unchanged when no fields need escaping', () => {
    const query = 'FROM index | LIMIT 10';
    const result = fixEsqlFieldEscaping(query, []);
    expect(result).toBe(query);
  });
});
