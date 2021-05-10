/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';

import _ from 'lodash';
import moment from 'moment';
import { useEffect, useMemo } from 'react';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { DispatchSetState } from './types';
import { Document } from '../persistence';

function containsDynamicMath(dateMathString: string) {
  return dateMathString.includes('now');
}

const TIME_LAG_PERCENTAGE_LIMIT = 0.02;

/**
 * Fetches the current global time range from data plugin and restarts session
 * if the fixed "now" parameter is diverging too much from the actual current time.
 * @param data data plugin contract to manage current now value, time range and session
 * @param lastKnownDoc Current state of the editor
 * @param dispatchSetState state setter for Lens app state
 * @param searchSessionId current session id
 */
export function useTimeRange(
  data: DataPublicPluginStart,
  lastKnownDoc: Document | undefined,
  dispatchSetState: DispatchSetState,
  searchSessionId: string
) {
  const timefilter = data.query.timefilter.timefilter;
  const { from, to } = data.query.timefilter.timefilter.getTime();

  // Need a stable reference for the frame component of the dateRange
  const resolvedDateRange = useMemo(() => {
    const { min, max } = timefilter.calculateBounds({
      from,
      to,
    });
    return { fromDate: min?.toISOString() || from, toDate: max?.toISOString() || to };
    // recalculate current date range if the session gets updated because it
    // might change "now" and calculateBounds depends on it internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timefilter, searchSessionId, from, to]);

  useEffect(() => {
    const unresolvedTimeRange = timefilter.getTime();
    if (
      !containsDynamicMath(unresolvedTimeRange.from) &&
      !containsDynamicMath(unresolvedTimeRange.to)
    ) {
      return;
    }

    const { min, max } = timefilter.getBounds();

    if (!min || !max) {
      // bounds not fully specified, bailing out
      return;
    }

    // calculate length of currently configured range in ms
    const timeRangeLength = moment.duration(max.diff(min)).asMilliseconds();

    // calculate lag of managed "now" for date math
    const nowDiff = Date.now() - data.nowProvider.get().valueOf();

    // if the lag is significant, start a new session to clear the cache
    if (nowDiff > timeRangeLength * TIME_LAG_PERCENTAGE_LIMIT) {
      dispatchSetState({ searchSessionId: data.search.session.start() });
    }
  }, [data.nowProvider, data.search.session, timefilter, dispatchSetState, lastKnownDoc]);

  return { resolvedDateRange, from, to };
}
