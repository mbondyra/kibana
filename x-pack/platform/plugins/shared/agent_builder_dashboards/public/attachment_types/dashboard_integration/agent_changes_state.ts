/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { firstValueFrom, from, race, timer } from 'rxjs';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  CHILDREN_UNSAVED_CHANGES_DEBOUNCE,
  UNSAVED_CHANGES_DEBOUNCE,
} from '@kbn/presentation-publishing';

/**
 * Layout manager refreshes `getSerializedState()` panel configs only after
 * `UNSAVED_CHANGES_DEBOUNCE` then `CHILDREN_UNSAVED_CHANGES_DEBOUNCE`. Wait that
 * long (+ buffer) so manual sync is not one edit behind.
 */
export const MANUAL_CHANGES_DEBOUNCE_MS =
  UNSAVED_CHANGES_DEBOUNCE + CHILDREN_UNSAVED_CHANGES_DEBOUNCE + 50;

const PANELS_LOAD_TIMEOUT_MS = 10000;

const agentChangesStates = new WeakMap<DashboardApi, Promise<DashboardState | undefined>>();

const getDashboardState = (api: DashboardApi): DashboardState =>
  api.getSerializedState().attributes;

const waitForPanelsToLoad = async (api: DashboardApi): Promise<void> => {
  const { panels, pinnedPanels } = api.layout$.getValue();
  const panelsLoaded = Promise.all(
    [...Object.keys(panels), ...Object.keys(pinnedPanels)].map((id) =>
      api.getChildApi(id).catch(() => undefined)
    )
  );
  await firstValueFrom(race(from(panelsLoaded), timer(PANELS_LOAD_TIMEOUT_MS)));
};

/**
 * Records the state the dashboard settles on once the agent's changes are applied and its panels
 * have loaded and published their state.
 */
export const trackAgentChanges = (api: DashboardApi, applied: Promise<void>): void => {
  const settle = async () => {
    await applied;
    await waitForPanelsToLoad(api);
    await firstValueFrom(timer(MANUAL_CHANGES_DEBOUNCE_MS));
    return getDashboardState(api);
  };
  agentChangesStates.set(
    api,
    settle().catch(() => undefined)
  );
};

/** Whether the dashboard still shows the agent's latest changes, once they have settled. */
export const isShowingAgentChanges = async (api: DashboardApi): Promise<boolean> => {
  const settled = agentChangesStates.get(api);
  const agentChangesState = await settled;
  if (agentChangesState !== undefined && deepEqual(agentChangesState, getDashboardState(api))) {
    return true;
  }
  // once the user moved away from the agent's changes, a change back to them is theirs to stage
  if (agentChangesStates.get(api) === settled) {
    agentChangesStates.delete(api);
  }
  return false;
};
