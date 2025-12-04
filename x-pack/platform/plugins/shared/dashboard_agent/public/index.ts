/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
} from './types';
import { DashboardAgentPlugin } from './plugin';

export const plugin: PluginInitializer<
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies
> = (_context: PluginInitializerContext) => {
  return new DashboardAgentPlugin();
};

export type {
  DashboardAgentPluginSetup as Setup,
  DashboardAgentPluginStart as Start,
} from './types';

