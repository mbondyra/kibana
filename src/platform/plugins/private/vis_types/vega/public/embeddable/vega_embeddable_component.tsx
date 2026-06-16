/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { fetch$, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { FetchContext } from '@kbn/presentation-publishing';
import { isOfQueryType } from '@kbn/es-query';
import { getExpressions } from '../services';
import type { VegaEmbeddableApi } from './types';

interface VegaEmbeddableComponentProps {
  api: VegaEmbeddableApi;
  spec$: BehaviorSubject<Record<string, unknown>>;
  onLoading: (loading: boolean) => void;
}

export const VegaEmbeddableComponent = ({
  api,
  spec$,
  onLoading,
}: VegaEmbeddableComponentProps) => {
  const { ReactExpressionRenderer } = getExpressions();
  const spec = useStateFromPublishingSubject(spec$);
  const [fetchContext, setFetchContext] = useState<FetchContext | undefined>(undefined);

  useEffect(() => {
    const subscription = fetch$(api).subscribe((nextFetchContext) => {
      setFetchContext(nextFetchContext);
    });
    return () => subscription.unsubscribe();
  }, [api]);

  // The Vega expression function consumes the spec as a string; the embeddable models it as an object.
  const expression = useMemo(
    () =>
      buildExpression([buildExpressionFunction('vega', { spec: JSON.stringify(spec) })]).toAst(),
    [spec]
  );

  return (
    <ReactExpressionRenderer
      expression={expression}
      searchContext={{
        timeRange: fetchContext?.timeRange,
        query: isOfQueryType(fetchContext?.query) ? fetchContext?.query : undefined,
        filters: fetchContext?.filters,
        disableWarningToasts: true,
      }}
      searchSessionId={fetchContext?.searchSessionId}
      onData$={() => onLoading(false)}
      onRender$={() => onLoading(false)}
    />
  );
};
