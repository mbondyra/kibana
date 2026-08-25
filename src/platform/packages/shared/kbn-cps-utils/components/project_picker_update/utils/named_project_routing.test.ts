/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getNamedProjectRoutingName,
  getNamedProjectRoutingReference,
  isNamedProjectRouting,
  truncateNamedProjectRoutingValue,
} from './named_project_routing';

describe('named project routing helpers', () => {
  describe('isNamedProjectRouting', () => {
    it('accepts @name references', () => {
      expect(isNamedProjectRouting('@origin_only')).toBe(true);
      expect(isNamedProjectRouting(' @origin_only ')).toBe(true);
      expect(isNamedProjectRouting('@kibana_space_default_default')).toBe(true);
    });

    it('rejects Lucene routing and empty values', () => {
      expect(isNamedProjectRouting(undefined)).toBe(false);
      expect(isNamedProjectRouting('')).toBe(false);
      expect(isNamedProjectRouting('@')).toBe(false);
      expect(isNamedProjectRouting('@@origin_only')).toBe(false);
      expect(isNamedProjectRouting('@origin only')).toBe(false);
      expect(isNamedProjectRouting('_alias:_origin')).toBe(false);
      expect(isNamedProjectRouting('_id:origin')).toBe(false);
    });
  });

  describe('getNamedProjectRoutingReference', () => {
    it('returns the trimmed @name', () => {
      expect(getNamedProjectRoutingReference(' @origin_only ')).toBe('@origin_only');
    });

    it('returns undefined for non-named routing', () => {
      expect(getNamedProjectRoutingReference('_alias:_origin')).toBeUndefined();
    });
  });

  describe('getNamedProjectRoutingName', () => {
    it('strips a leading @', () => {
      expect(getNamedProjectRoutingName('@origin_only')).toBe('origin_only');
    });

    it('accepts a bare expression name', () => {
      expect(getNamedProjectRoutingName('origin_only')).toBe('origin_only');
    });

    it('returns undefined for blank values', () => {
      expect(getNamedProjectRoutingName('')).toBeUndefined();
      expect(getNamedProjectRoutingName('@')).toBeUndefined();
      expect(getNamedProjectRoutingName('   ')).toBeUndefined();
    });
  });

  describe('truncateNamedProjectRoutingValue', () => {
    it('returns short values unchanged', () => {
      expect(truncateNamedProjectRoutingValue('_alias:_origin')).toBe('_alias:_origin');
    });

    it('truncates long values for tooltips', () => {
      const value = 'a'.repeat(130);
      expect(truncateNamedProjectRoutingValue(value)).toBe(`${'a'.repeat(120)}…`);
    });
  });
});
