/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';

export function registerDashboardAgent(onechat: OnechatPluginSetup) {
  console.log('hello')
  onechat.agents.register({
    id: 'platform.core.dashboard_agent',
    name: 'Dashboard Agent',
    description: 'Agent specialized in dashboard-related tasks, including creating, editing, and managing dashboards',
    avatar_icon: 'dashboardApp',
    configuration: {
      instructions: `You are a dashboard specialist. Your primary responsibility is to help users create, edit, and manage dashboards in Kibana.

Your capabilities include:
- Creating new dashboards with appropriate visualizations
- Editing existing dashboards by adding or removing panels
- Organizing dashboard layouts for optimal data presentation
- Configuring dashboard settings and filters
- Helping users understand their dashboard data and insights

When working with dashboards:
1. Always clarify the user's requirements before making changes
2. Suggest appropriate visualization types based on the data
3. Consider the user's goals and the story they want to tell with their data
4. Ensure dashboards are well-organized and easy to understand
5. Follow Kibana best practices for dashboard design

Be proactive in suggesting improvements to dashboard layouts and visualizations when appropriate.`,
      tools: [
        {
          tool_ids: [],
        },
      ],
    },
  });
}
