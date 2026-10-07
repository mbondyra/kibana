/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * How the agent authors Lens panels: `delegated` describes each panel in natural language to a
   * chart author, `direct` also lets the agent write the ES|QL query and Lens config itself.
   */
  panelAuthoring: schema.oneOf([schema.literal('delegated'), schema.literal('direct')], {
    defaultValue: 'delegated',
  }),
});

export type AgentBuilderDashboardsConfig = TypeOf<typeof configSchema>;

export type PanelAuthoringMode = AgentBuilderDashboardsConfig['panelAuthoring'];

export const config: PluginConfigDescriptor<AgentBuilderDashboardsConfig> = {
  schema: configSchema,
};
