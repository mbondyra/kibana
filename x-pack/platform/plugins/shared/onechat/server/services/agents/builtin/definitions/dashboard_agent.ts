/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common';
import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';

export const DASHBOARD_AGENT_ID = 'platform_core_dashboard_agent';

export const createDashboardAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: DASHBOARD_AGENT_ID,
    name: 'Dashboard Agent',
    description: 'Specialized agent for creating and managing dashboards',
    configuration: {
      tools: [
        {
          tool_ids: [
            platformCoreTools.createDashboard,
            platformCoreTools.createVisualization,
            platformCoreTools.executeEsql,
            platformCoreTools.generateEsql,
            platformCoreTools.search,
            platformCoreTools.listIndices,
            platformCoreTools.getIndexMapping,
          ],
        },
      ],
    },
    isEnabled: async ({ request, uiSettings, savedObjects }) => {
      const soClient = savedObjects.getScopedClient(request);
      const uiSettingsClient = uiSettings.asScopedToClient(soClient);
      return await uiSettingsClient.get<boolean>(AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID);
    },
  };
};
