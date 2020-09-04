/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useState } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  euiDragDropReorder,
  EuiButtonIcon,
  EuiLink,
  EuiText,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  htmlIdGenerator,
} from '@elastic/eui';
import { updateColumnParam } from '../../../state_helpers';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { FilterPopover } from './filter_popover';
import { IndexPattern } from '../../../types';
import {
  Query,
  esKuery,
  esQuery,
  DataPublicPluginStart,
} from '../../../../../../../../src/plugins/data/public';

const generateId = htmlIdGenerator();

// references types from src/plugins/data/common/search/aggs/buckets/filters.ts
export interface Filter {
  input: Query;
  label: string;
}
export interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

const searchQueryLabel = i18n.translate('xpack.lens.indexPattern.searchQuery', {
  defaultMessage: 'Search query',
});

export const defaultLabel = i18n.translate('xpack.lens.indexPattern.filters.label.placeholder', {
  defaultMessage: 'All records',
});

// we don't have an access data plugin in places where we use this function,
// what's why we have a fallback default input
const getDefaultFilter = (data?: DataPublicPluginStart): Filter => ({
  input: data
    ? data.query.queryString.getDefaultQuery()
    : {
        query: '',
        language: 'kuery',
      },
  label: '',
});

export const isQueryValid = (input: Query, indexPattern: IndexPattern) => {
  try {
    if (input.language === 'kuery') {
      esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(input.query), indexPattern);
    } else {
      esQuery.luceneStringToDsl(input.query);
    }
    return true;
  } catch (e) {
    return false;
  }
};

interface DraggableLocation {
  droppableId: string;
  index: number;
}

export interface FiltersIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'filters';
  params: {
    filters: Filter[];
  };
}

export const filtersOperation: OperationDefinition<FiltersIndexPatternColumn> = {
  type: 'filters',
  displayName: searchQueryLabel,
  priority: 3, // Higher than any metric
  getPossibleOperationForField: ({ type }) => {
    if (type === 'document') {
      return {
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  isTransferable: () => false,

  onFieldChange: (oldColumn, indexPattern, field) => oldColumn,

  buildColumn({ suggestedPriority, field, previousColumn }) {
    let params = previousColumn?.params?.filters
      ? previousColumn.params
      : { filters: [getDefaultFilter()] };
    if (previousColumn?.operationType === 'terms') {
      params = {
        filters: [
          {
            label: '',
            input: {
              query: `${previousColumn.sourceField} : *`,
              language: 'kuery',
            },
          },
        ],
      };
    }
    return {
      label: searchQueryLabel,
      dataType: 'string',
      operationType: 'filters',
      scale: 'ordinal',
      suggestedPriority,
      isBucketed: true,
      sourceField: field.name,
      params,
    };
  },

  toEsAggsConfig: (column, columnId, indexPattern) => {
    const validFilters = column.params.filters?.filter((f: Filter) =>
      isQueryValid(f.input, indexPattern)
    );
    return {
      id: columnId,
      enabled: true,
      type: 'filters',
      schema: 'segment',
      params: {
        filters: validFilters?.length > 0 ? validFilters : [getDefaultFilter()],
      },
    };
  },

  paramEditor: ({ state, setState, currentColumn, layerId, data }) => {
    const indexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];
    const filters = currentColumn.params.filters;

    const setFilters = (newFilters: Filter[]) =>
      setState(
        updateColumnParam({
          state,
          layerId,
          currentColumn,
          paramName: 'filters',
          value: newFilters,
        })
      );

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filters.queries', {
            defaultMessage: 'Queries',
          })}
        >
          <FilterList
            filters={filters}
            setFilters={setFilters}
            indexPattern={indexPattern}
            defaultQuery={getDefaultFilter(data)}
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
};

export const FilterList = ({
  filters,
  setFilters,
  indexPattern,
  defaultQuery,
}: {
  filters: Filter[];
  setFilters: Function;
  indexPattern: IndexPattern;
  defaultQuery: Filter;
}) => {
  const [isOpenByCreation, setIsOpenByCreation] = useState(false);
  const [localFilters, setLocalFilters] = useState(() =>
    filters.map((filter) => ({ ...filter, id: generateId() }))
  );

  const updateFilters = (updatedFilters: FilterValue[]) => {
    // do not set internal id parameter into saved object
    setFilters(updatedFilters.map((filter) => omit(filter, 'id')));
    setLocalFilters(updatedFilters);
  };

  const onAddFilter = () =>
    updateFilters([
      ...localFilters,
      {
        ...defaultQuery,
        id: generateId(),
      },
    ]);
  const onRemoveFilter = (id: string) =>
    updateFilters(localFilters.filter((filter) => filter.id !== id));

  const onChangeValue = (id: string, query: Query, label: string) =>
    updateFilters(
      localFilters.map((filter) =>
        filter.id === id
          ? {
              ...filter,
              input: query,
              label,
            }
          : filter
      )
    );

  const onDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(localFilters, source.index, destination.index);
      updateFilters(items);
    }
  };
  return (
    <div>
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="FILTERS_DROPPABLE_AREA" spacing="s">
          {localFilters?.map((filter: FilterValue, idx: number) => {
            const { input, label, id } = filter;
            return (
              <EuiDraggable
                spacing="m"
                key={id}
                index={idx}
                draggableId={id}
                disableInteractiveElementBlocking
              >
                {(provided) => (
                  <EuiPanel paddingSize="none">
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <div className="lnsLayerPanel__dndGrab">
                          <EuiIcon
                            type="grab"
                            aria-label={i18n.translate('xpack.lens.indexPattern.filters.grabIcon', {
                              defaultMessage: 'Grab icon',
                            })}
                          />
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem
                        grow={true}
                        data-test-subj="indexPattern-filters-existingFilterContainer"
                      >
                        <FilterPopover
                          isOpenByCreation={idx === localFilters.length - 1 && isOpenByCreation}
                          setIsOpenByCreation={setIsOpenByCreation}
                          indexPattern={indexPattern}
                          filter={filter}
                          Button={({ onClick }: { onClick: MouseEventHandler }) => (
                            <EuiLink
                              color="text"
                              onClick={onClick}
                              className="lnsLayerPanel__filterLink"
                              data-test-subj="indexPattern-filters-existingFilterTrigger"
                            >
                              <EuiText
                                size="s"
                                textAlign="left"
                                color={isQueryValid(input, indexPattern) ? 'default' : 'danger'}
                              >
                                {label || input.query || defaultLabel}
                              </EuiText>
                            </EuiLink>
                          )}
                          setFilter={(f: FilterValue) => {
                            onChangeValue(f.id, f.input, f.label);
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          size="m"
                          iconType="cross"
                          color="danger"
                          data-test-subj="indexPattern-filters-existingFilterDelete"
                          onClick={() => {
                            onRemoveFilter(filter.id);
                          }}
                          aria-label={i18n.translate(
                            'xpack.lens.indexPattern.filters.deleteSearchQuery',
                            {
                              defaultMessage: 'Delete search query',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                )}
              </EuiDraggable>
            );
          })}
        </EuiDroppable>
      </EuiDragDropContext>

      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={() => {
          onAddFilter();
          setIsOpenByCreation(true);
        }}
      >
        {i18n.translate('xpack.lens.indexPattern.filters.addSearchQuery', {
          defaultMessage: 'Add a search query',
        })}
      </EuiButtonEmpty>
    </div>
  );
};
