/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIndexForESQLQuery,
  getESQLAdHocDataview,
  getInitialESQLQuery,
  getESQLQueryColumns,
} from '@kbn/esql-utils';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { AggregateQuery } from '@kbn/es-query';
import type { LensRuntimeState, LensSerializedState } from '@kbn/lens-common';
import { isESQLModeEnabled } from './initializers/utils';
import type { LensEmbeddableStartServices } from './types';
import { addColumnsToCache } from '../datasources/text_based/fieldlist_cache';

export type ESQLStartServices = Pick<
  LensEmbeddableStartServices,
  'dataViews' | 'data' | 'visualizationMap' | 'datasourceMap' | 'uiSettings' | 'coreStart'
>;

/**
 * Fetches ES|QL column schema and populates the cache.
 * The datasource initialize method will use the cached columns to enrich column metadata.
 */
export async function populateESQLColumnsCache(
  query: AggregateQuery,
  services: Pick<ESQLStartServices, 'data'>
): Promise<void> {
  if (!('esql' in query) || !query.esql) {
    return;
  }

  try {
    const abortController = new AbortController();
    const columns = await getESQLQueryColumns({
      esqlQuery: query.esql,
      search: services.data.search.search,
      signal: abortController.signal,
      timeRange: services.data.query.timefilter.timefilter.getAbsoluteTime(),
    });

    addColumnsToCache(query, columns);
  } catch (e) {
    // If fetching columns fails, the cache won't be populated
    // The columns will be enriched later when the query runs
  }
}

export async function loadESQLAttributes({
  dataViews,
  data,
  visualizationMap,
  datasourceMap,
  uiSettings,
  coreStart,
}: ESQLStartServices): Promise<LensSerializedState['attributes'] | undefined> {
  // Early exit if ESQL is not supported
  if (!isESQLModeEnabled({ uiSettings })) {
    return;
  }
  const indexName = await getIndexForESQLQuery({ dataViews });
  // Early exit if there's no data view to use
  if (!indexName) {
    return;
  }

  // From this moment on there are no longer early exists before suggestions
  // so make sure to load async modules while doing other async stuff to save some time
  const [dataView, { suggestionsApi }] = await Promise.all([
    getESQLAdHocDataview({
      dataViewsService: dataViews,
      query: `FROM ${indexName}`,
      http: coreStart.http,
    }),
    import('../async_services'),
  ]);

  const esqlQuery = getInitialESQLQuery(dataView);

  const defaultEsqlQuery = {
    esql: esqlQuery,
  };

  // For the suggestions api we need only the columns
  // so we are requesting them with limit 0
  // this is much more performant than requesting
  // all the table
  const abortController = new AbortController();
  const columns = await getESQLQueryColumns({
    esqlQuery,
    search: data.search.search,
    signal: abortController.signal,
    timeRange: data.query.timefilter.timefilter.getAbsoluteTime(),
  });

  const context = {
    dataViewSpec: dataView.toSpec(false),
    fieldName: '',
    textBasedColumns: columns,
    query: defaultEsqlQuery,
  };

  // get the initial attributes from the suggestions api
  const allSuggestions =
    suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!allSuggestions.length) {
    return;
  }
  const [firstSuggestion] = allSuggestions;
  return getLensAttributesFromSuggestion({
    filters: [],
    query: defaultEsqlQuery,
    suggestion: {
      ...firstSuggestion,
      title: '', // when creating a new panel, we don't want to use the title from the suggestion
    },
    dataView,
  });
}
