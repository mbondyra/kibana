/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { TimeRange } from '@kbn/es-query';
import { getTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import useAsync from 'react-use/lib/useAsync';

const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-24h', to: 'now' };

interface Params {
  dataViews: DataViewsServicePublic;
  lens: LensPublicStart;
  lensConfig: any;
  timeRange?: TimeRange;
}

interface ReturnValue {
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (v: TypedLensByValueInput) => void;
  isLoading: boolean;
  error?: Error;
}

const enrichTextBasedLayersWithTimeField = (attributes: TypedLensByValueInput['attributes']) => {
  const textBasedLayers = attributes.state.datasourceStates.textBased?.layers;
  if (!textBasedLayers) {
    return attributes;
  }

  let changed = false;
  const nextLayers = Object.fromEntries(
    Object.entries(textBasedLayers).map(([layerId, layer]) => {
      const timeFieldFromQuery =
        layer.query && 'esql' in layer.query
          ? getTimeFieldFromESQLQuery(layer.query.esql)
          : undefined;
      const nextTimeField = layer.timeField ?? timeFieldFromQuery;

      if (!nextTimeField || nextTimeField === layer.timeField) {
        return [layerId, layer];
      }

      changed = true;
      return [
        layerId,
        {
          ...layer,
          timeField: nextTimeField,
        },
      ];
    })
  );

  if (!changed) {
    return attributes;
  }

  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...attributes.state.datasourceStates.textBased,
          layers: nextLayers,
        },
      },
    },
  };
};

export function useLensInput({ dataViews, lens, lensConfig, timeRange }: Params): ReturnValue {
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const resolvedTimeRange = timeRange ?? DEFAULT_TIME_RANGE;

  // convert lens config to lens attributes
  const lensResult = useMemo(() => {
    try {
      return {
        attributes: enrichTextBasedLayersWithTimeField(
          new LensConfigBuilder().fromAPIFormat(lensConfig)
        ),
      };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  }, [lensConfig]);

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>(() =>
    lensResult.attributes
      ? {
          attributes: lensResult.attributes,
          id: uuidv4(),
          timeRange: resolvedTimeRange,
        }
      : undefined
  );

  useEffect(() => {
    if (!lensInput) {
      return;
    }

    if (
      lensInput.timeRange?.from === resolvedTimeRange.from &&
      lensInput.timeRange?.to === resolvedTimeRange.to
    ) {
      return;
    }

    setLensInput({
      ...lensInput,
      id: uuidv4(),
      timeRange: resolvedTimeRange,
    });
  }, [lensInput, resolvedTimeRange]);

  const configError = 'error' in lensResult ? lensResult.error : undefined;
  const isLoading = !configError && (!lensHelpersAsync.value || !lensInput);

  return {
    lensInput,
    setLensInput,
    isLoading,
    error: configError || lensHelpersAsync.error || undefined,
  };
}
