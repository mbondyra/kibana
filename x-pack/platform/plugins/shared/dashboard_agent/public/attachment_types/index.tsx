/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isToolUiEvent, isRoundCompleteEvent, getLatestVersion } from '@kbn/agent-builder-common';
import type {
  DashboardAttachmentData,
  PanelAddedEventData,
  PanelsRemovedEventData,
} from '@kbn/dashboard-agent-common';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
} from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DashboardFlyout } from '../components/dashboard_flyout';
import { AttachmentStore } from '../services/attachment_store';

/**
 * Registers the dashboard attachment UI definition, including the icon and label.
 * Returns a cleanup function that should be called when the plugin stops.
 */
export const registerDashboardAttachmentUiDefinition = ({
  attachments,
  chat$,
  share,
  core,
}: {
  attachments: AttachmentServiceStartContract;
  chat$: Observable<ChatEvent>;
  share?: SharePluginStart;
  core: CoreStart;
}): (() => void) => {
  const attachmentStore = new AttachmentStore();
  // Helper function to open the flyout
  const openFlyout = (attachmentId: string, data: DashboardAttachmentData) => {
    // Set the current attachment in the store
    attachmentStore.setAttachment(attachmentId, data);

    const onClose = () => {
      attachmentStore.clear();
      flyoutSession?.close();
    };

    const flyoutSession = core.overlays.openFlyout(
      toMountPoint(
        <KibanaRenderContextProvider {...core}>
          <DashboardFlyout
            initialData={data}
            attachmentId={attachmentId}
            attachmentStore={attachmentStore}
            chat$={chat$}
            onClose={onClose}
            share={share}
          />
        </KibanaRenderContextProvider>,
        core
      ),
      {
        'data-test-subj': 'dashboardAttachmentFlyoutOverlay',
        ownFocus: true,
        onClose,
        size: 'l',
        maxWidth: '50vw',
        paddingSize: 'none',
        type: 'push',
        isResizable: true,
      }
    );
  };

  // Register the callback so the store can open the flyout when updates arrive
  attachmentStore.registerOpenFlyoutCallback(openFlyout);

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
    onClick: ({ attachment }) => {
      const data = attachment.data as DashboardAttachmentData | undefined;
      if (!data) return;

      openFlyout(attachment.id, data);
    },
  });

  // Subscribe to chat events for progressive panel updates
  const eventsSubscription = chat$.subscribe((event) => {
    // Handle progressive panel additions
    if (
      isToolUiEvent<typeof DASHBOARD_PANEL_ADDED_EVENT, PanelAddedEventData>(
        event,
        DASHBOARD_PANEL_ADDED_EVENT
      )
    ) {
      const { dashboardAttachmentId, panel } = event.data.data as PanelAddedEventData;
      attachmentStore.addPanel(dashboardAttachmentId, panel);
    }

    // Handle progressive panel removals
    if (
      isToolUiEvent<typeof DASHBOARD_PANELS_REMOVED_EVENT, PanelsRemovedEventData>(
        event,
        DASHBOARD_PANELS_REMOVED_EVENT
      )
    ) {
      const { dashboardAttachmentId, panelIds } = event.data.data as PanelsRemovedEventData;
      attachmentStore.removePanels(dashboardAttachmentId, panelIds);
    }

    // Handle final attachment update (round complete)
    if (isRoundCompleteEvent(event) && event.data.attachments) {
      for (const attachment of event.data.attachments) {
        if (attachment.type === DASHBOARD_ATTACHMENT_TYPE) {
          const latestVersion = getLatestVersion(attachment);
          if (latestVersion?.data) {
            attachmentStore.updateAttachment(
              attachment.id,
              latestVersion.data as DashboardAttachmentData
            );
          }
        }
      }
    }
  });

  return () => {
    eventsSubscription.unsubscribe();
  };
};
