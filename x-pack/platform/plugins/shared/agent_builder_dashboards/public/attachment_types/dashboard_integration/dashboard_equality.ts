/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { dashboardStateToAttachmentData } from '@kbn/agent-builder-dashboards-common';
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

type AttachmentData = DashboardAttachment['data'];

// attachment data is persisted as JSON, which drops the undefined keys a serialized dashboard writes out
const asPersisted = (data: AttachmentData): AttachmentData => JSON.parse(JSON.stringify(data));

/**
 * Whether the open dashboard shows the attachment data. Until dashboards can compare their states,
 * panels that fill in defaults the attachment doesn't have make this false.
 */
export const isShowing = async (api: DashboardApi, data: AttachmentData): Promise<boolean> =>
  deepEqual(
    asPersisted(dashboardStateToAttachmentData(api.getSerializedState().attributes)),
    asPersisted(data)
  );
