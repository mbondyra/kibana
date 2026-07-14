/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasUnescapedDigitLeadingFieldSegment } from './identifier';

describe('hasUnescapedDigitLeadingFieldSegment', () => {
  it('detects a digit-leading segment in an unescaped dotted field path', () => {
    expect(
      hasUnescapedDigitLeadingFieldSegment(
        'TS metrics | STATS AVG(AVG_OVER_TIME(system.cpu.load_average.1m))'
      )
    ).toBe(true);
  });

  it('detects a digit-leading segment in the middle of a dotted field path', () => {
    expect(hasUnescapedDigitLeadingFieldSegment('FROM index | KEEP field.1m.value')).toBe(true);
  });

  it('detects a digit-leading first segment', () => {
    expect(hasUnescapedDigitLeadingFieldSegment('FROM index | KEEP 15m.value')).toBe(true);
  });

  it.each(['ROW value = 1.5', 'ROW value = 1.5e3', 'ROW value = -1.5E-3'])(
    'does not mistake the numeric literal in "%s" for a field path',
    (query) => {
      expect(hasUnescapedDigitLeadingFieldSegment(query)).toBe(false);
    }
  );

  it('ignores dotted paths in string literals', () => {
    expect(hasUnescapedDigitLeadingFieldSegment('ROW value = "system.cpu.load_average.1m"')).toBe(
      false
    );
  });

  it('ignores backtick-quoted identifiers', () => {
    expect(
      hasUnescapedDigitLeadingFieldSegment(
        'TS metrics | STATS AVG(AVG_OVER_TIME(`system.cpu.load_average.1m`))'
      )
    ).toBe(false);
  });
});
