/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, IndexPatternPrivateState } from './types';
import { OriginalColumn } from './rename_columns';

function getExpressionForLayer(
  indexPattern: IndexPattern,
  columns: Record<string, IndexPatternColumn>,
  columnOrder: string[]
) {
  if (columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    return operationDefinitionMap[column.operationType].toEsAggsConfig(column, columnId);
  }

  const columnEntries = columnOrder.map(colId => [colId, columns[colId]] as const);
  const bucketsCount = columnEntries.filter(([, entry]) => entry.isBucketed).length;
  const metricsCount = columnEntries.length - bucketsCount;

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    /**
     * Because we are turning on metrics at all levels, the sequence generation
     * logic here is more complicated. Examples follow:
     *
     * Example 1: [Count]
     * Output: [`col-0-count`]
     *
     * Example 2: [Terms, Terms, Count]
     * Output: [`col-0-terms0`, `col-2-terms1`, `col-3-count`]
     *
     * Example 3: [Terms, Terms, Count, Max]
     * Output: [`col-0-terms0`, `col-3-terms1`, `col-4-count`, `col-5-max`]
     */
    const idMap = columnEntries.reduce((currentIdMap, [colId, column], index) => {
      const newIndex = column.isBucketed
        ? index * (metricsCount + 1) // Buckets are spaced apart by N + 1
        : (index ? index + 1 : 0) - bucketsCount + (bucketsCount - 1) * (metricsCount + 1);
      return {
        ...currentIdMap,
        [`col-${columnEntries.length === 1 ? 0 : newIndex}-${colId}`]: {
          ...column,
          id: colId,
        },
      };
    }, {} as Record<string, OriginalColumn>);

    const formatterOverrides = columnEntries
      .map(([id, col]) => {
        const format = col.params && 'format' in col.params ? col.params.format : undefined;
        if (!format) {
          return null;
        }
        const base = `| lens_format_column format="${format.id}" columnId="${id}"`;
        if (typeof format.params?.decimals === 'number') {
          return base + ` decimals=${format.params.decimals}`;
        }
        return base;
      })
      .filter(expr => !!expr)
      .join(' ');

    return `esaggs
      index="${indexPattern.id}"
      metricsAtAllLevels=true
      partialRows=false
      includeFormatHints=true
      aggConfigs={lens_auto_date aggConfigs='${JSON.stringify(
        aggs
      )}'} | lens_rename_columns idMap='${JSON.stringify(idMap)}' ${formatterOverrides}`;
  }

  return null;
}

export function toExpression(state: IndexPatternPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.indexPatterns[state.layers[layerId].indexPatternId],
      state.layers[layerId].columns,
      state.layers[layerId].columnOrder
    );
  }

  return null;
}
