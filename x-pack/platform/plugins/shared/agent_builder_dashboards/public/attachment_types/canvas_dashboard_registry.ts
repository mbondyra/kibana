/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export interface CanvasDashboard {
  /** The dashboard attachment the canvas renders. */
  attachmentId: string;
  closeCanvas: () => void;
}

export interface CanvasDashboardRegistry {
  /** Returns a callback that unregisters the dashboard. */
  register: (api: DashboardApi, canvasDashboard: CanvasDashboard) => () => void;
  get: (api: unknown) => CanvasDashboard | undefined;
}

/**
 * Dashboards rendered in the sidebar chat canvas. The full-page canvas isn't tracked, since
 * `addAttachment` doesn't reach the full-page chat.
 */
export const createCanvasDashboardRegistry = (): CanvasDashboardRegistry => {
  const canvasDashboards = new Map<unknown, CanvasDashboard>();
  return {
    register: (api, canvasDashboard) => {
      canvasDashboards.set(api, canvasDashboard);
      return () => {
        if (canvasDashboards.get(api) === canvasDashboard) {
          canvasDashboards.delete(api);
        }
      };
    },
    get: (api) => canvasDashboards.get(api),
  };
};
