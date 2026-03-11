/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { filter } from 'rxjs';
import { ATTACHMENT_REF_OPERATION } from '@kbn/agent-builder-common/attachments';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common/chat';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { CoreStart } from '@kbn/core/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type {
  DashboardApi,
  DashboardRendererProps,
  DashboardStart,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DashboardCanvasContent } from './dashboard_canvas_content';
import { getStateFromAttachment } from './attachment_to_dashboard_state';
import { runDashboardAppFlow } from './dashboard_app_flow';

export const registerDashboardAttachmentUiDefinition = ({
  core,
  dashboardLocator,
  unifiedSearch,
  dashboardPlugin,
  agentBuilder: {
    events: { chat$ },
    attachments,
  },
}: {
  core: CoreStart;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboardPlugin: DashboardStart;
  agentBuilder: AgentBuilderPluginStart;
}) => {
  let dashboardApi: DashboardApi | undefined;
  let confirmedOverwriteForId: string | undefined;
  const dashboardAppApiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
    dashboardApi = api;
  });

  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };

  const chatEventsSubscription = chat$
    .pipe(
      filter(isRoundCompleteEvent),
      filter(() => Boolean(dashboardApi))
    )
    .subscribe((event) => {
      // todo: properly type this all
      const updatedDashboardAttachment = event.data.attachments?.find(
        (attachment): attachment is DashboardAttachment =>
          attachment.type === DASHBOARD_ATTACHMENT_TYPE &&
          event.data.round.input.attachment_refs?.some(
            (ref) =>
              ref.attachment_id === attachment.id &&
              ref.operation === ATTACHMENT_REF_OPERATION.updated || ref.operation === ATTACHMENT_REF_OPERATION.created
          ) === true
      );

      if (!updatedDashboardAttachment) {
        return;
      }

      const currentSavedObjectId = dashboardApi!.savedObjectId$.getValue();
      const attachmentLinkedSavedObjectId = updatedDashboardAttachment.origin?.savedObjectId;

      // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
      if (currentSavedObjectId && attachmentLinkedSavedObjectId !== currentSavedObjectId) {
        return;
      }

      dashboardApi!.setState(
        getStateFromAttachment({
          ...updatedDashboardAttachment,
          data: updatedDashboardAttachment.versions[updatedDashboardAttachment.versions.length - 1]
            .data as DashboardAttachment['data'],
        })
      );
      setTimeout(() => dashboardApi!.scrollToBottom(), 0);
    });

  attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    renderCanvasContent: (props, callbacks) => (
      <DashboardCanvasContent
        {...props}
        registerActionButtons={callbacks.registerActionButtons}
        updateOrigin={callbacks.updateOrigin}
        dashboardLocator={dashboardLocator}
        searchBarComponent={unifiedSearch.ui.SearchBar}
        checkSavedDashboardExist={checkSavedDashboardExist}
      />
    ),
    getActionButtons: ({ attachment, openCanvas, isCanvas }) => {
      if (isCanvas) {
        return [];
      }
      return [
        {
          label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.previewActionLabel', {
            defaultMessage: 'Preview',
          }),
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            if (!dashboardApi) {
              openCanvas?.();
              return;
            }
            runDashboardAppFlow({
              core,
              attachment,
              dashboardApi,
              confirmedOverwriteForIdState: [
                confirmedOverwriteForId,
                (id) => (confirmedOverwriteForId = id),
              ],
            });
          },
        },
      ];
    },
  });

  return () => {
    dashboardAppApiSubscription.unsubscribe();
    chatEventsSubscription.unsubscribe();
    dashboardApi = undefined;
  };
};
