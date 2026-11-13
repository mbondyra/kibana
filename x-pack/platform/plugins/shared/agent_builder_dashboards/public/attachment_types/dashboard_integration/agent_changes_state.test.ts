/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  isShowingAgentChanges,
  MANUAL_CHANGES_DEBOUNCE_MS,
  trackAgentChanges,
} from './agent_changes_state';

const buildDashboardApi = () => {
  let resolvePanel: () => void = () => {};
  const panelLoaded = new Promise<void>((resolve) => {
    resolvePanel = resolve;
  });
  const api = {
    layout$: new BehaviorSubject({ panels: { 'panel-1': {} }, pinnedPanels: {} }),
    getChildApi: jest.fn(() => panelLoaded),
    getSerializedState: jest.fn<{ attributes: object }, []>(() => ({
      attributes: { title: 'Agent dashboard', panels: [] },
    })),
  };
  return { api, dashboardApi: api as unknown as DashboardApi, resolvePanel };
};

describe('isShowingAgentChanges', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("is false for a dashboard the agent hasn't changed", async () => {
    const { dashboardApi } = buildDashboardApi();

    await expect(isShowingAgentChanges(dashboardApi)).resolves.toBe(false);
  });

  it('compares with the state the dashboard has once its panels have loaded', async () => {
    const { api, dashboardApi, resolvePanel } = buildDashboardApi();
    trackAgentChanges(dashboardApi, Promise.resolve());
    const loadedState = { attributes: { title: 'Agent dashboard', panels: [{ id: 'panel-1' }] } };

    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);
    api.getSerializedState.mockReturnValue(loadedState);
    resolvePanel();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    await expect(isShowingAgentChanges(dashboardApi)).resolves.toBe(true);
  });

  it('is false once the dashboard changes after the agent changes', async () => {
    const { api, dashboardApi, resolvePanel } = buildDashboardApi();
    trackAgentChanges(dashboardApi, Promise.resolve());
    resolvePanel();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    api.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });

    await expect(isShowingAgentChanges(dashboardApi)).resolves.toBe(false);
  });

  it('is false when applying the agent changes failed', async () => {
    const { dashboardApi } = buildDashboardApi();
    trackAgentChanges(dashboardApi, Promise.reject(new Error('Panel failed to load')));

    await expect(isShowingAgentChanges(dashboardApi)).resolves.toBe(false);
  });
});
