/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectFormat, Props } from './save';
import { createMockDatasource, createMockFramePublicAPI, createMockVisualization } from '../mocks';
import { esFilters, IIndexPattern, IFieldType } from '../../../../../../src/plugins/data/public';

jest.mock('./expression_helpers');

describe('save editor frame state', () => {
  const mockVisualization = createMockVisualization();
  const mockDatasource = createMockDatasource('a');
  const mockIndexPattern = ({ id: 'indexpattern' } as unknown) as IIndexPattern;
  const mockField = ({ name: '@timestamp' } as unknown) as IFieldType;

  mockDatasource.getPersistableState.mockImplementation((x) => ({
    state: x,
    savedObjectReferences: [],
  }));
  const saveArgs: Props = {
    activeDatasources: {
      indexpattern: mockDatasource,
    },
    visualization: mockVisualization,
    title: 'aaa',
    description: 'desc',
    state: {
      datasourceStates: {
        indexpattern: {
          state: 'hello',
          isLoading: false,
        },
      },
      visualization: { activeId: '2', state: {} },
    },
    query: { query: '', language: 'lucene' },
    filters: [esFilters.buildExistsFilter(mockField, mockIndexPattern)],
  };

  it('transforms from internal state to persisted doc format', async () => {
    const datasource = createMockDatasource('a');
    datasource.getPersistableState.mockImplementation((state) => ({
      state: {
        stuff: `${state}_datasource_persisted`,
      },
      savedObjectReferences: [],
    }));
    datasource.toExpression.mockReturnValue('my | expr');

    const visualization = createMockVisualization();
    visualization.toExpression.mockReturnValue('vis | expr');

    const { doc, filterableIndexPatterns } = await getSavedObjectFormat({
      ...saveArgs,
      activeDatasources: {
        indexpattern: datasource,
      },
      state: {
        datasourceStates: {
          indexpattern: {
            state: '2',
            isLoading: false,
          },
        },
        visualization: { activeId: '3', state: '4' },
      },
      visualization,
    });

    expect(filterableIndexPatterns).toEqual([]);
    expect(doc).toEqual({
      id: undefined,
      description: 'desc',
      title: 'aaa',
      state: {
        datasourceStates: {
          indexpattern: {
            stuff: '2_datasource_persisted',
          },
        },
        visualization: '4',
        query: { query: '', language: 'lucene' },
        filters: [
          {
            meta: { indexRefName: 'filter-index-pattern-0' },
            exists: { field: '@timestamp' },
          },
        ],
      },
      references: [
        {
          id: 'indexpattern',
          name: 'filter-index-pattern-0',
          type: 'index-pattern',
        },
      ],
      type: 'lens',
      visualizationType: '3',
    });
  });
});
