/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { delay, finalize, switchMap, tap } from 'rxjs/operators';
import { waitUntilNextSessionCompletes$ } from '../../../../../src/plugins/data/public';

import { trackUiEvent } from '../lens_ui_telemetry';

export const syncExternalContextState = ({ data, initialContext, getState, dispatchSetState }) => {
  const { query: queryService, search } = data;
  const { filterManager, queryString, timefilter } = queryService;
  const { timefilter: timefilterService } = timefilter;

  // Clear app-specific filters when navigating to Lens. Necessary because Lens
  // can be loaded without a full page refresh. If the user navigates to Lens from Discover
  // we keep the filters
  if (!initialContext) {
    filterManager.setAppFilters([]);
  }

  const startSession = () => search.session.start();

  const sessionSubscription = search.session
    .getSession$()
    // wait for a tick to filter/timerange subscribers the chance to update the session id in the state
    .pipe(delay(0))
    // then update if it didn't get updated yet
    .subscribe((newSessionId) => {
      if (newSessionId && getState().app.searchSessionId !== newSessionId) {
        console.log(
          `%c sessionSubscription ${newSessionId}, ${getState().app.searchSessionId}`,
          'background: #222; color: #bada55'
        );
        dispatchSetState({
          searchSessionId: newSessionId,
        });
      }
    });

  const filterSubscription = filterManager.getUpdates$().subscribe({
    next: () => {
      dispatchSetState({
        searchSessionId: startSession(),
        filters: filterManager.getFilters(),
      });
      trackUiEvent('app_filters_updated');
      console.log('%c filterSubscription ', 'background: #222; color: #bada55');
    },
  });

  const timeSubscription = timefilterService.getTimeUpdate$().subscribe({
    next: () => {
      dispatchSetState({ searchSessionId: startSession() });
      console.log('%c timeSubscription ', 'background: #222; color: #bada55');
    },
  });

  const autoRefreshSubscription = timefilterService
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        dispatchSetState({ searchSessionId: startSession() });
        console.log(
          '%c timeautoRefreshSubscriptionSubscription ',
          'background: #222; color: #bada55'
        );
      }),
      switchMap((done) =>
        // best way in lens to estimate that all panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(search.session).pipe(finalize(done))
      )
    )
    .subscribe();

  const stopSyncingExternalContextState = () => {
    filterSubscription.unsubscribe();
    timeSubscription.unsubscribe();
    autoRefreshSubscription.unsubscribe();
    sessionSubscription.unsubscribe();
  };

  return { stopSyncingExternalContextState };
};
