import { createSlice, configureStore, getDefaultMiddleware, PayloadAction } from '@reduxjs/toolkit';
import { Query, Filter, SavedQuery, IFieldFormat } from '../../../../../src/plugins/data/public';
import logger from 'redux-logger';
import { LensAppState } from './types';

const initialState: LensAppState = {
  searchSessionId: 'something',
  filters: [],
  query: { language: 'kquery', query: '' },
  indexPatternsForTopNav: [],
  isSaveModalVisible: false,
  isSaveable: false,
  indicateNoData: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setup: (state, { payload }) => {
      state.searchSessionId = payload.id;
      state.query = payload.query;
      state.filters = payload.filters;
    },
    setState: (state, {payload}: PayloadAction<Partial<LensAppState>>)=>{
        return {
            ...state,
            ...payload
        }
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

export const { startSession, setFilters, setQuery, setup, setState } = appSlice.actions;

export const lensStore = configureStore({
  reducer,
  middleware: [...getDefaultMiddleware(), logger],
});
