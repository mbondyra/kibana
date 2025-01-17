/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATEST_VERSION } from '../../common/content_management';
import { convertNumberToDashboardVersion } from '../services/dashboard_content_management_service/lib/dashboard_versioning';

export const DASHBOARD_CONTAINER_TYPE = 'dashboard';

export const LATEST_DASHBOARD_CONTAINER_VERSION = convertNumberToDashboardVersion(LATEST_VERSION);

export { LazyDashboardRenderer } from './external_api/lazy_dashboard_renderer';
export type { DashboardLocatorParams } from './types';
