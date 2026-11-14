/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { isShowing, MANUAL_CHANGES_DEBOUNCE_MS, markAttachmentApplied } from './dashboard_equality';

const agentData = {
  title: 'Agent dashboard',
  panels: [],
} as unknown as DashboardAttachment['data'];
// panels fill in defaults the attachment doesn't have once they load
const settledAttributes = { title: 'Agent dashboard', panels: [], options: { use_margins: true } };

const buildDashboardApi = () => {
  let resolvePanel: () => void = () => {};
  const panelLoaded = new Promise<void>((resolve) => {
    resolvePanel = resolve;
  });
  const api = {
    layout$: new BehaviorSubject({ panels: { 'panel-1': {} }, pinnedPanels: {} }),
    getChildApi: jest.fn(() => panelLoaded),
    getSerializedState: jest.fn<{ attributes: object }, []>(() => ({
      attributes: { title: 'User dashboard', panels: [] },
    })),
  };
  return { api, dashboardApi: api as unknown as DashboardApi, resolvePanel };
};

describe('isShowing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is true when the dashboard state is the attachment data', async () => {
    const { api, dashboardApi } = buildDashboardApi();
    api.getSerializedState.mockReturnValue({
      attributes: { ...agentData, description: undefined },
    });

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(true);
  });

  it("is false for data the dashboard doesn't show", async () => {
    const { dashboardApi } = buildDashboardApi();

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(false);
  });

  it('compares with the state the dashboard has once its panels have loaded', async () => {
    const { api, dashboardApi, resolvePanel } = buildDashboardApi();
    api.getSerializedState.mockReturnValue({ attributes: agentData });
    markAttachmentApplied(dashboardApi, agentData, Promise.resolve());

    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);
    api.getSerializedState.mockReturnValue({ attributes: settledAttributes });
    resolvePanel();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(true);
  });

  it('is false once the dashboard changes after the attachment was applied', async () => {
    const { api, dashboardApi, resolvePanel } = buildDashboardApi();
    api.getSerializedState.mockReturnValue({ attributes: settledAttributes });
    markAttachmentApplied(dashboardApi, agentData, Promise.resolve());
    resolvePanel();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    api.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(false);
  });

  it('is true again once the dashboard changes back to the applied state', async () => {
    const { api, dashboardApi, resolvePanel } = buildDashboardApi();
    api.getSerializedState.mockReturnValue({ attributes: settledAttributes });
    markAttachmentApplied(dashboardApi, agentData, Promise.resolve());
    resolvePanel();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    api.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });
    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(false);
    api.getSerializedState.mockReturnValue({ attributes: settledAttributes });

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(true);
  });

  it('is false for other data than the applied one', async () => {
    const { api, dashboardApi, resolvePanel } = buildDashboardApi();
    api.getSerializedState.mockReturnValue({ attributes: settledAttributes });
    markAttachmentApplied(dashboardApi, agentData, Promise.resolve());
    resolvePanel();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    const newerData = { ...agentData, title: 'Newer agent dashboard' };

    await expect(isShowing(dashboardApi, newerData)).resolves.toBe(false);
  });

  it('is false when applying the attachment failed', async () => {
    const { dashboardApi } = buildDashboardApi();
    markAttachmentApplied(
      dashboardApi,
      agentData,
      Promise.reject(new Error('Panel failed to load'))
    );

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(false);
  });
});
