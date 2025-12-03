/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
  ConfigSchema,
} from './types';
import { OnechatPlugin } from './plugin';

export type { OnechatPluginSetup, OnechatPluginStart };

// Export generic helpers for use by other plugins
export {
  createTagParser,
  findToolResult,
} from './application/components/conversations/conversation_rounds/round_response/markdown_plugins';

export const plugin: PluginInitializer<
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) => {
  return new OnechatPlugin(pluginInitializerContext);
};
