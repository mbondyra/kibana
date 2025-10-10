/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerDashboardAgent } from './register_agent';

export class DashboardAgentPlugin
  implements Plugin<DashboardAgentPluginSetup, DashboardAgentPluginStart>
{
  private logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    _coreSetup: CoreSetup,
    setupDeps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    this.logger.debug('#########Setting up Dashboard Agent plugin');

    // Register the dashboard agent with onechat
    registerDashboardAgent(setupDeps.onechat);

    return {};
  }

  start(_coreStart: CoreStart): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
