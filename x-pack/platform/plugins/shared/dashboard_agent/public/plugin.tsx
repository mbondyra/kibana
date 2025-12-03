/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import { dashboardElement } from '@kbn/onechat-common/tools/tool_result';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  setup(
    core: CoreSetup<DashboardAgentStartDependencies>,
    deps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    // Register dashboard renderer with onechat
    deps.onechat.registerToolResultRenderer({
      id: 'dashboard',
      tagName: dashboardElement.tagName,
      tagParser: () => {
        // Lazy load to avoid circular dependencies
        const { dashboardTagParser } = require('./markdown/dashboard_tag_parser');
        return dashboardTagParser;
      },
      createRenderer: (props) => {
        // Lazy load to avoid circular dependencies
        const { createDashboardRenderer } = require('./markdown/dashboard_renderer');
        return createDashboardRenderer(props);
      },
    });

    return {};
  }

  start(): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}

