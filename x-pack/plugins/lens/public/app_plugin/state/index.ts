/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, configureStore, getDefaultMiddleware, PayloadAction } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux';
import { LensAppState } from './types';

const initialState: LensAppState = {
  searchSessionId: '',
  filters: [],
  query: { language: 'kuery', query: '' },
  indexPatternsForTopNav: [],
  isSaveModalVisible: false,
  isSaveable: false,
  indicateNoData: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    reset: (state) => {
      return initialState
    },
    setState: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    setStateM: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    startSession: (state, { payload }: PayloadAction<{ id: string }>) => {
      state.searchSessionId = payload.id;
    },
    setFilters: (state, { payload }) => {
      state.filters = payload.filters;
      state.searchSessionId = payload.id;
    },
    setQuery: (state, { payload }) => {
      state.query = payload.query;
      state.searchSessionId = payload.id;
    },
  },
});

export const reducer = {
  app: appSlice.reducer,
};

export const { startSession, setFilters, setQuery, setState, setStateM } = appSlice.actions;


export const configureLensStore = () => configureStore({
  reducer,
  middleware: [
    ...getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: [
          'app.indexPatternsForTopNav',
          'payload.indexPatternsForTopNav',
          'app.indexPatterns',
          'payload.indexPatterns',
          'app.filters',
        ],
        ignoredActions: ['app/setState'],
      },
    }),
    logger,
  ],
});

export const lensStore = configureLensStore()

export type LensRootStore = ReturnType<typeof lensStore.getState>;
export type LensDispatch = typeof lensStore.dispatch;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootStore> = useSelector;
