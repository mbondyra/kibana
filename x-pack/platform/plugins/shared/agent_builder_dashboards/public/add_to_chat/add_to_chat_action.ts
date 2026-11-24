/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, map, skip } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  dashboardStateToAttachmentData,
  findPanelById,
  getDashboardPanelAttachmentId,
  getPanelLabel,
  isDashboardAttachment,
  type DashboardAttachmentData,
  type PendingDashboardAttachment,
  type PendingDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { ADD_TO_CHAT_ACTION_ID } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  apiHasParentApi,
  apiHasUniqueId,
  apiIsOfType,
  apiPublishesEsql,
  apiPublishesTitle,
  getTitle,
  type EmbeddableApiContext,
  type HasTypeDisplayName,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { CanvasDashboard, CanvasDashboardRegistry, IdGenerator } from '../attachment_types';
import { resolveDashboardAttachmentLink } from '../attachment_types/dashboard_integration/reconcile';

export const DASHBOARD_PANEL_ADD_TO_CHAT_PATHWAY = 'dashboard_panel';

export interface DashboardAddToChatActionDeps {
  agentBuilder: Pick<
    AgentBuilderPluginStart,
    'openChat' | 'addAttachment' | 'events' | 'getAgentBuilderAccess'
  >;
  dashboardAppApi$: DashboardStart['dashboardAppClientApi$'];
  canvasDashboards: Pick<CanvasDashboardRegistry, 'get'>;
  analytics: AnalyticsServiceStart;
  canWriteDashboards: boolean;
  draftAttachmentId: IdGenerator;
}

interface PanelDashboard {
  dashboardApi: DashboardApi;
  /** Set when rendered in the sidebar chat canvas. */
  canvasDashboard?: CanvasDashboard;
}

/** The dashboard app's or the sidebar canvas's dashboard holding the panel. */
const getPanelDashboard = (
  embeddable: unknown,
  { dashboardAppApi$, canvasDashboards }: DashboardAddToChatActionDeps
): PanelDashboard | undefined => {
  if (!apiHasParentApi(embeddable)) {
    return undefined;
  }
  const { parentApi } = embeddable;
  const dashboardAppApi = dashboardAppApi$.getValue();
  if (dashboardAppApi && parentApi === dashboardAppApi) {
    return { dashboardApi: dashboardAppApi };
  }
  const canvasDashboard = canvasDashboards.get(parentApi);
  return canvasDashboard ? { dashboardApi: parentApi as DashboardApi, canvasDashboard } : undefined;
};

const isRefinablePanel = (embeddable: unknown): embeddable is HasUniqueId =>
  apiHasUniqueId(embeddable) &&
  (apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE) ||
    (apiIsOfType(embeddable, LENS_EMBEDDABLE_TYPE) &&
      apiPublishesEsql(embeddable) &&
      embeddable.esql$.getValue().length > 0));

/** Title, else a label derived from the config, else the custom panel type name. */
const getPointerLabel = (
  embeddable: HasUniqueId,
  dashboardData: DashboardAttachmentData
): string => {
  const title = apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined;
  const panel = findPanelById(dashboardData.panels, embeddable.uuid);
  const derived = panel ? getPanelLabel(panel) : undefined;
  const typeDisplayName = apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
    ? (embeddable as Partial<HasTypeDisplayName>).getTypeDisplayName?.()
    : undefined;
  return (title || derived || typeDisplayName || '').slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH);
};

const reportClicked = (
  analytics: AnalyticsServiceStart,
  attachmentTypes: readonly string[]
): void => {
  try {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, {
      pathway: DASHBOARD_PANEL_ADD_TO_CHAT_PATHWAY,
      attachments: [...attachmentTypes],
    });
  } catch {
    // never break the action on telemetry errors
  }
};

/** Sends a pointer to an ES|QL Lens or custom panel, plus the dashboard when the chat lacks it. */
export const createDashboardAddToChatAction = (
  deps: DashboardAddToChatActionDeps
): ActionDefinition<EmbeddableApiContext> => {
  const { agentBuilder, analytics, canWriteDashboards, draftAttachmentId } = deps;

  const getRefinableDashboard = async (
    embeddable: unknown
  ): Promise<PanelDashboard | undefined> => {
    const panelDashboard = getPanelDashboard(embeddable, deps);
    if (!canWriteDashboards || !panelDashboard || !isRefinablePanel(embeddable)) {
      return undefined;
    }
    const { hasRequiredLicense, hasLlmConnector } = await agentBuilder.getAgentBuilderAccess();
    return hasRequiredLicense && hasLlmConnector ? panelDashboard : undefined;
  };

  return {
    id: ADD_TO_CHAT_ACTION_ID,
    type: ADD_TO_CHAT_ACTION_ID,
    order: 25,
    getDisplayName: () =>
      i18n.translate('xpack.agentBuilderDashboards.addToChat.displayName', {
        defaultMessage: 'Add to chat',
      }),
    getIconType: () => 'addToChat',
    isCompatible: async ({ embeddable }) => Boolean(await getRefinableDashboard(embeddable)),
    getCompatibilityChangesSubject: ({ embeddable }): Observable<undefined> | undefined =>
      apiPublishesEsql(embeddable)
        ? embeddable.esql$.pipe(
            skip(1),
            map(() => undefined)
          )
        : undefined,
    execute: async ({ embeddable }) => {
      const panelDashboard = await getRefinableDashboard(embeddable);
      if (!panelDashboard || !isRefinablePanel(embeddable)) {
        return;
      }
      const { dashboardApi, canvasDashboard } = panelDashboard;

      const dashboardData = dashboardStateToAttachmentData(
        dashboardApi.getSerializedState().attributes
      );
      const panelType = apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
        ? CUSTOM_CONTENT_EMBEDDABLE_TYPE
        : LENS_EMBEDDABLE_TYPE;
      const buildDashboardAttachment = (
        id: string,
        origin: string | undefined
      ): PendingDashboardAttachment => ({
        id,
        origin,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardData,
      });
      const buildPanelPointer = (
        dashboardAttachmentId: string
      ): PendingDashboardPanelAttachment => ({
        id: getDashboardPanelAttachmentId({ dashboardAttachmentId, panelId: embeddable.uuid }),
        type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
        data: {
          dashboard_attachment_id: dashboardAttachmentId,
          panel_id: embeddable.uuid,
          label: getPointerLabel(embeddable, dashboardData),
          panel_type: panelType,
        },
      });

      // close the canvas, which covers the chat input
      if (canvasDashboard) {
        agentBuilder.addAttachment(buildPanelPointer(canvasDashboard.attachmentId));
        canvasDashboard.closeCanvas();
        reportClicked(analytics, [DASHBOARD_PANEL_ATTACHMENT_TYPE]);
        return;
      }

      const activeConversation = await firstValueFrom(agentBuilder.events.ui.activeConversation$);
      const { origin, attachment: linkedAttachment } = resolveDashboardAttachmentLink({
        api: dashboardApi,
        canWriteDashboards,
        attachments:
          activeConversation?.conversation?.attachments?.filter(isDashboardAttachment) ?? [],
      });

      if (!activeConversation) {
        agentBuilder.openChat({
          newConversation: true,
          sessionTag: 'dashboard',
          attachments: [
            buildDashboardAttachment(draftAttachmentId.current, origin),
            buildPanelPointer(draftAttachmentId.current),
          ],
        });
        reportClicked(analytics, [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE]);
        return;
      }

      if (linkedAttachment) {
        agentBuilder.addAttachment(buildPanelPointer(linkedAttachment.id));
        reportClicked(analytics, [DASHBOARD_PANEL_ATTACHMENT_TYPE]);
        return;
      }

      // no linked attachment, e.g. an unlinkable dashboard: stage it under the draft id
      agentBuilder.addAttachment(buildDashboardAttachment(draftAttachmentId.current, origin));
      agentBuilder.addAttachment(buildPanelPointer(draftAttachmentId.current));
      reportClicked(analytics, [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE]);
    },
  };
};
