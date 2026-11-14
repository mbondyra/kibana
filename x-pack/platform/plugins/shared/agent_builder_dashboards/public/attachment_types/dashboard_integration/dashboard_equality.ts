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
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { dashboardStateToAttachmentData } from '@kbn/agent-builder-dashboards-common';
import {
  CHILDREN_UNSAVED_CHANGES_DEBOUNCE,
  UNSAVED_CHANGES_DEBOUNCE,
} from '@kbn/presentation-publishing';

/*
 * Whether the open dashboard shows an attachment's data. Until dashboards can compare their states,
 * this compares the serialized dashboard with the attachment data, and recognizes the state the
 * dashboard settled on once the agent's changes were applied, which panels may have filled in with
 * defaults the attachment doesn't have.
 */

/**
 * Layout manager refreshes `getSerializedState()` panel configs only after
 * `UNSAVED_CHANGES_DEBOUNCE` then `CHILDREN_UNSAVED_CHANGES_DEBOUNCE`. Wait that
 * long (+ buffer) so manual sync is not one edit behind.
 */
export const MANUAL_CHANGES_DEBOUNCE_MS =
  UNSAVED_CHANGES_DEBOUNCE + CHILDREN_UNSAVED_CHANGES_DEBOUNCE + 50;

const PANELS_LOAD_TIMEOUT_MS = 10000;

type AttachmentData = DashboardAttachment['data'];

interface AppliedAttachment {
  data: AttachmentData;
  settledState: Promise<DashboardState | undefined>;
}

const appliedAttachments = new WeakMap<DashboardApi, AppliedAttachment>();

// attachment data is persisted as JSON, which drops the undefined keys a serialized dashboard writes out
const asPersisted = (data: AttachmentData): AttachmentData => JSON.parse(JSON.stringify(data));

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
 * Records the state the dashboard settles on once the attachment data is applied and its panels
 * have loaded and published their state.
 */
export const markAttachmentApplied = (
  api: DashboardApi,
  data: AttachmentData,
  applied: Promise<void>
): void => {
  const settle = async () => {
    await applied;
    await waitForPanelsToLoad(api);
    await firstValueFrom(timer(MANUAL_CHANGES_DEBOUNCE_MS));
    return getDashboardState(api);
  };
  appliedAttachments.set(api, {
    data: asPersisted(data),
    settledState: settle().catch(() => undefined),
  });
};

/** Whether the open dashboard shows the attachment data, once applied changes have settled. */
export const isShowing = async (api: DashboardApi, data: AttachmentData): Promise<boolean> => {
  const persistedData = asPersisted(data);
  if (
    deepEqual(asPersisted(dashboardStateToAttachmentData(getDashboardState(api))), persistedData)
  ) {
    return true;
  }
  const applied = appliedAttachments.get(api);
  if (!applied || !deepEqual(applied.data, persistedData)) {
    return false;
  }
  const settledState = await applied.settledState;
  return settledState !== undefined && deepEqual(settledState, getDashboardState(api));
};
