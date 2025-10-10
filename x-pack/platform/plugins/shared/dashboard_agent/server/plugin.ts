/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext, RequestHandlerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerDashboardAgent } from './register_agent';
import { createDashboardTool } from './tools';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    this.logger.debug('Setting up Dashboard Agent plugin');
    // Register dashboard-specific tools during start lifecycle when dashboard plugin is available
    coreSetup.getStartServices().then(([coreStart, startDeps]) => {
      const { dashboard } = startDeps;

      const requestHandlerContext = {
        core: Promise.resolve(coreStart),
        resolve: async (_path: string[]) => {
          throw new Error('Context resolve not implemented for dashboard tool');
        },
      } as unknown as RequestHandlerContext;

      setupDeps.onechat.tools.register(
        createDashboardTool(dashboard, requestHandlerContext)
      );
    });

    // Register the dashboard agent with onechat
    registerDashboardAgent(setupDeps.onechat);

    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
