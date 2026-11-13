/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import {
  openInDashboardApp,
  type DashboardLocator,
} from './dashboard_integration/open_in_dashboard_app';

export const handleEditInDashboard = async ({
  locator,
  getExistingDashboardId,
  dashboardLocatorParams,
  onOpenNewDashboard,
}: {
  locator: DashboardLocator;
  getExistingDashboardId: () => Promise<string | undefined>;
  dashboardLocatorParams: DashboardLocatorParams;
  /** Called right before a new dashboard opens, when there's no existing one. */
  onOpenNewDashboard?: () => void;
}) => {
  const dashboardId = await getExistingDashboardId();
  if (!dashboardId) {
    onOpenNewDashboard?.();
  }
  await openInDashboardApp(locator, { ...dashboardLocatorParams, dashboardId });
};
