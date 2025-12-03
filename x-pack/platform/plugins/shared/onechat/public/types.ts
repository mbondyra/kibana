/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { ToolServiceStartContract } from '@kbn/onechat-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationFlyoutOptions } from './flyout/types';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import type { Node } from 'unist';

export interface ConversationFlyoutRef {
  close(): void;
}

export interface OpenConversationFlyoutReturn {
  flyoutRef: ConversationFlyoutRef;
}

/**
 * Custom tag parser function that transforms markdown AST nodes
 */
export interface CustomTagParser {
  (): (tree: Node) => void;
}

/**
 * Custom renderer component props
 */
export interface CustomRendererProps {
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}

/**
 * Custom renderer component for tool results
 */
export type CustomRenderer = React.ComponentType<CustomRendererProps>;

/**
 * Registration for a custom tool result renderer
 */
export interface ToolResultRendererRegistration {
  /** Unique identifier for this renderer (e.g., 'dashboard') */
  id: string;
  /** Tag name to parse (e.g., 'dashboard') */
  tagName: string;
  /** Parser function to extract attributes from markdown */
  tagParser: CustomTagParser;
  /** React component factory to render the parsed element */
  createRenderer: (props: CustomRendererProps) => CustomRenderer;
}

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface OnechatSetupDependencies {
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface OnechatStartDependencies {
  inference: InferencePublicStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  dataViews: DataViewsPublicPluginStart;
  cloud: CloudStart;
  share: SharePluginStart;
  uiActions: UiActionsStart;
  spaces?: SpacesPluginStart;
  dashboard: DashboardStart;
}

export interface OnechatPluginSetup {
  /**
   * Register a custom renderer for a tool result type.
   * This allows other plugins to extend onechat's rendering capabilities.
   *
   * @param registration - The renderer registration configuration
   *
   * @example
   * ```tsx
   * setup(core, deps) {
   *   deps.onechat.registerToolResultRenderer({
   *     id: 'dashboard',
   *     tagName: 'dashboard',
   *     tagParser: dashboardTagParser,
   *     createRenderer: createDashboardRenderer,
   *   });
   * }
   * ```
   */
  registerToolResultRenderer: (registration: ToolResultRendererRegistration) => void;
}

/**
 * Public start contract for the browser-side onechat plugin.
 */
export interface OnechatPluginStart {
  /**
   * Tool service contract, can be used to list or execute tools.
   */
  tools: ToolServiceStartContract;
  /**
   * Opens a conversation flyout.
   *
   * @param options - Configuration options for the flyout
   * @returns An object containing the flyout reference
   *
   * @example
   * ```tsx
   * // Open a new conversation with close handler
   * const { flyoutRef } = plugins.onechat.openConversationFlyout({
   *   onClose: () => console.log('Flyout closed')
   * });
   *
   * // Programmatically close the flyout
   * flyoutRef.close();
   * ```
   */
  openConversationFlyout: (options?: OpenConversationFlyoutOptions) => OpenConversationFlyoutReturn;
  setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => void;
  clearConversationFlyoutActiveConfig: () => void;
}
