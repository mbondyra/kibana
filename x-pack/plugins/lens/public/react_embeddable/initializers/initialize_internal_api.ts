/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { buildObservableVariable } from '../helper';
import type {
  ExpressionWrapperProps,
  LensInternalApi,
  LensOverrides,
  LensRuntimeState,
} from '../types';
import { apiHasAbortController } from '../type_guards';
import type { UserMessage } from '../../types';

export function initializeInternalApi(
  initialState: LensRuntimeState,
  parentApi: unknown
): LensInternalApi {
  const [hasRenderCompleted$] = buildObservableVariable<boolean>(false);
  const [expressionParams$] = buildObservableVariable<ExpressionWrapperProps | null>(null);
  const expressionAbortController$ = new BehaviorSubject<AbortController | undefined>(undefined);
  if (apiHasAbortController(parentApi)) {
    expressionAbortController$.next(parentApi.abortController);
  }
  const [renderCount$] = buildObservableVariable<number>(0);

  const attributes$ = new BehaviorSubject<LensRuntimeState['attributes']>(initialState.attributes);
  const overrides$ = new BehaviorSubject(initialState.overrides);
  const disableTriggers$ = new BehaviorSubject(initialState.disableTriggers);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);

  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
  const messages$ = new BehaviorSubject<UserMessage[]>([]);

  // No need to expose anything at public API right now, that would happen later on
  // where each initializer will pick what it needs and publish it
  return {
    attributes$,
    overrides$,
    disableTriggers$,
    dataLoading$,
    hasRenderCompleted$,
    expressionParams$,
    expressionAbortController$,
    renderCount$,
    dataViews: dataViews$,
    dispatchError: () => {
      hasRenderCompleted$.next(true);
      renderCount$.next(renderCount$.getValue() + 1);
    },
    dispatchRenderStart: () => hasRenderCompleted$.next(false),
    dispatchRenderComplete: () => {
      renderCount$.next(renderCount$.getValue() + 1);
      hasRenderCompleted$.next(true);
    },
    updateExpressionParams: (newParams: ExpressionWrapperProps | null) =>
      expressionParams$.next(newParams),
    updateDataLoading: (newDataLoading: boolean | undefined) => dataLoading$.next(newDataLoading),
    updateOverrides: (overrides: LensOverrides['overrides']) => overrides$.next(overrides),
    updateAttributes: (attributes: LensRuntimeState['attributes']) => attributes$.next(attributes),
    updateAbortController: (abortController: AbortController | undefined) =>
      expressionAbortController$.next(abortController),
    updateDataViews: (dataViews: DataView[] | undefined) => dataViews$.next(dataViews),
    messages$,
    updateMessages: (newMessages: UserMessage[]) => messages$.next(newMessages),
    resetAllMessages: () => {
      messages$.next([]);
    },
  };
}
