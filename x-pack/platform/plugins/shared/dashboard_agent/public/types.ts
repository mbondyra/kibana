/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardStart } from '@kbn/dashboard-plugin/public';

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/public';

export interface DashboardAgentSetupDependencies {
  onechat: OnechatPluginSetup;
}

export interface DashboardAgentStartDependencies {
  dashboard: DashboardStart;
}

export interface DashboardAgentPluginSetup {}

export interface DashboardAgentPluginStart {}

