/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { isShowing } from './dashboard_equality';

const agentData = {
  title: 'Agent dashboard',
  panels: [],
} as unknown as DashboardAttachment['data'];

const buildDashboardApi = (attributes: object) =>
  ({ getSerializedState: () => ({ attributes }) } as unknown as DashboardApi);

describe('isShowing', () => {
  it('is true when the dashboard state is the attachment data', async () => {
    const dashboardApi = buildDashboardApi({ ...agentData, description: undefined });

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(true);
  });

  it("is false for data the dashboard doesn't show", async () => {
    const dashboardApi = buildDashboardApi({ title: 'User dashboard', panels: [] });

    await expect(isShowing(dashboardApi, agentData)).resolves.toBe(false);
  });
});
