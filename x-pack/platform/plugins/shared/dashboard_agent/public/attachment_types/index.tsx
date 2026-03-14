/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { filter } from 'rxjs';
import {
  ATTACHMENT_REF_OPERATION,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common/chat';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
  DashboardAttachmentOrigin,
} from '@kbn/dashboard-agent-common/types';
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
import { handlePreviewInDashboard } from './dashboard_app_flow';

type VersionedDashboardAttachment = VersionedAttachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> & {
  origin?: DashboardAttachmentOrigin;
};

export const registerDashboardAttachmentUiDefinition = ({
  dashboardLocator,
  unifiedSearch,
  dashboardPlugin,
  agentBuilder: {
    events: { chat$ },
    attachments,
  },
}: {
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboardPlugin: DashboardStart;
  agentBuilder: AgentBuilderPluginStart;
}) => {
  let dashboardApi: DashboardApi | undefined;
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
      const updatedVersionedAttachment = event.data.attachments?.find(
        (attachment): attachment is VersionedDashboardAttachment =>
          attachment.type === DASHBOARD_ATTACHMENT_TYPE &&
          event.data.round.input.attachment_refs?.some(
            (ref) =>
              (ref.attachment_id === attachment.id &&
                ref.operation === ATTACHMENT_REF_OPERATION.updated) ||
              ref.operation === ATTACHMENT_REF_OPERATION.created
          ) === true
      );

      if (!updatedVersionedAttachment) {
        return;
      }

      const currentSavedObjectId = dashboardApi!.savedObjectId$.getValue();
      const attachmentLinkedSavedObjectId = updatedVersionedAttachment.origin?.savedObjectId;

      // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
      if (currentSavedObjectId && attachmentLinkedSavedObjectId !== currentSavedObjectId) {
        return;
      }

      // Get the latest version's data
      const latestVersion =
        updatedVersionedAttachment.versions[updatedVersionedAttachment.versions.length - 1];
      if (!latestVersion) {
        return;
      }

      const attachment: DashboardAttachment = {
        id: updatedVersionedAttachment.id,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: latestVersion.data,
        origin: updatedVersionedAttachment.origin,
      };

      dashboardApi!.setState(getStateFromAttachment(attachment));
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
            handlePreviewInDashboard({
              attachment,
              dashboardApi,
              doesSavedDashboardExist,
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
