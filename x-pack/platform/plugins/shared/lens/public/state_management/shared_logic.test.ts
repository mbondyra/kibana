/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { Filter } from '@kbn/es-query';
import { getActiveDataFromDatatable, mergeToNewDoc } from './shared_logic';
import type { Datasource, DatasourceMap, VisualizationMap } from '../types';

describe('lens shared logic', () => {
  describe('#mergeToNewDoc - projectRouting', () => {
    const createMockDeps = () => {
      const mockDatasource = {
        id: 'testDatasource',
        getPersistableState: jest.fn((state) => ({ state, references: [] })),
      };

      const mockVisualization = {
        id: 'testVis',
        getPersistableState: jest.fn((state) => ({ state, references: [] })),
      };

      const datasourceMap: DatasourceMap = {
        testDatasource: mockDatasource as unknown as Datasource,
      };

      const visualizationMap: VisualizationMap = {
        testVis: mockVisualization as unknown as VisualizationMap[string],
      };

      const extractFilterReferences = jest.fn((filters: Filter[]) => ({
        state: filters,
        references: [],
      }));

      return { datasourceMap, visualizationMap, extractFilterReferences };
    };

    const createMockState = () => ({
      persistedDoc: {
        savedObjectId: 'test-id',
        title: 'Test Lens',
        type: 'lens' as const,
        visualizationType: 'testVis',
        references: [],
        state: {
          visualization: {},
          query: { query: '', language: 'kuery' as const },
          filters: [],
          datasourceStates: { testDatasource: {} },
          internalReferences: [],
          adHocDataViews: {},
        },
      },
      visualization: {
        state: {},
        activeId: 'testVis',
      },
      datasourceStates: {
        testDatasource: {
          state: {},
          isLoading: false,
        },
      },
      query: { query: '', language: 'kuery' as const },
      filters: [] as Filter[],
      activeDatasourceId: 'testDatasource',
      adHocDataViews: {},
    });

    it('should omit projectRouting when undefined', () => {
      const deps = createMockDeps();
      const state = createMockState();

      const result = mergeToNewDoc(
        state.persistedDoc,
        state.visualization,
        state.datasourceStates,
        state.query,
        state.filters,
        state.activeDatasourceId,
        state.adHocDataViews,
        undefined, // projectRouting is undefined
        deps
      );

      expect(result?.state.projectRouting).toBeUndefined();
      // Verify it's not in the state object at all
      expect(Object.keys(result?.state || {})).not.toContain('projectRouting');
    });

    it('should include projectRouting when set to _alias:_origin', () => {
      const deps = createMockDeps();
      const state = createMockState();

      const result = mergeToNewDoc(
        state.persistedDoc,
        state.visualization,
        state.datasourceStates,
        state.query,
        state.filters,
        state.activeDatasourceId,
        state.adHocDataViews,
        '_alias:_origin', // projectRouting is explicitly set
        deps
      );

      expect(result?.state.projectRouting).toBe('_alias:_origin');
    });
  });

  describe('#getActiveDataFromDatatable', () => {
    const defaultLayerId = 'default-layer';
    const firstTable: Datatable = {
      type: 'datatable',
      columns: [],
      rows: [],
    };
    const secondTable: Datatable = {
      type: 'datatable',
      columns: [],
      rows: [],
    };

    it('should return {} for empty datatable', () => {
      expect(getActiveDataFromDatatable(defaultLayerId, undefined)).toEqual({});
    });

    it('should return multiple tables', () => {
      const datatables: Record<string, Datatable> = {
        first: firstTable,
        second: secondTable,
      };
      expect(getActiveDataFromDatatable(defaultLayerId, datatables)).toEqual({
        first: firstTable,
        second: secondTable,
      });
    });

    it('should return since table with default layer id', () => {
      const datatables: Record<string, Datatable> = {
        first: firstTable,
      };
      expect(getActiveDataFromDatatable(defaultLayerId, datatables)).toEqual({
        [defaultLayerId]: firstTable,
      });
    });
  });
});
