/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import type { Observable } from 'rxjs';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { type DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { normalizePanels } from '../../common';
import type { AttachmentStore } from '../services/attachment_store';
import { DashboardFlyoutFooter, type DashboardFlyoutInitialInput } from './dashboard_flyout_footer';

const arePanelsEqual = (
  a: DashboardAttachmentData['panels'],
  b: DashboardAttachmentData['panels']
): boolean => {
  if (a.length !== b.length) return false;
  const aIds = a.map((p) => p.panelId).sort();
  const bIds = b.map((p) => p.panelId).sort();
  return aIds.every((id, i) => id === bIds[i]);
};

const getDashboardFlyoutStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => ({
  header: css({
    paddingInline: euiTheme.size.m,
    paddingBlock: euiTheme.size.m,
  }),
  body: css({
    '& .euiFlyoutBody__overflowContent': {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
  }),
  dashboardContainer: (unconfirmedPanelStyles: Record<string, Record<string, string>>) =>
    css({
      flex: 1,
      minHeight: 400,
      height: '100%',
      '& .embPanel__hoverActions': {
        display: 'none !important',
      },
      ...unconfirmedPanelStyles,
    }),
});

export interface DashboardFlyoutProps {
  initialData: DashboardAttachmentData;
  attachmentId: string;
  attachmentStore: AttachmentStore;
  chat$: Observable<ChatEvent>;
  onClose: () => void;
  share?: SharePluginStart;
}

export const DashboardFlyout: React.FC<DashboardFlyoutProps> = ({
  initialData,
  attachmentId,
  attachmentStore,
  chat$,
  onClose,
  share,
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = getDashboardFlyoutStyles(euiTheme);

  const [data, setData] = useState<DashboardAttachmentData>(initialData);
  const [version, setVersion] = useState(0);
  const { panels, title, description, savedObjectId } = data;

  // Track current panels to detect changes from attachment store
  const currentPanelsRef = useRef(initialData.panels);

  // Track confirmed panel IDs (panels that exist in the attachment)
  const [confirmedPanelIds, setConfirmedPanelIds] = useState<Set<string>>(
    () => new Set(initialData.panels.map((p) => p.panelId))
  );

  // Track the last created panel ID for highlighting and scrolling
  const [lastCreatedPanelId, setLastCreatedPanelId] = useState<string | null>(null);
  const dashboardContainerRef = useRef<HTMLDivElement>(null);

  // Generate CSS for unconfirmed panels (panels in current data but not in attachment)
  // The last created panel gets a highlight effect, others get reduced opacity
  const unconfirmedPanelStyles = useMemo(() => {
    const unconfirmedIds = panels
      .filter((p) => !confirmedPanelIds.has(p.panelId))
      .map((p) => p.panelId);

    return unconfirmedIds.reduce<Record<string, Record<string, string>>>((panelStyles, id) => {
      const isLastCreated = id === lastCreatedPanelId;
      const panelSelector = `.dshDashboardGrid__item[id="panel-${id}"]`;
      panelStyles[panelSelector] = isLastCreated
        ? {
            outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.vis.euiColorVis0}`,
            transition: 'outline 0.3s ease-in-out',
            opacity: '0.5',
          }
        : {
            outline: `${euiTheme.border.width.thick} solid transparent`,
            transition: 'outline 0.3s ease-in-out',
            opacity: '0.5',
          };
      return panelStyles;
    }, {});
  }, [panels, confirmedPanelIds, lastCreatedPanelId, euiTheme]);

  // Scroll to the last created panel when it appears and auto-clear highlight after 3 seconds
  useEffect(() => {
    if (!lastCreatedPanelId || !dashboardContainerRef.current) {
      return;
    }

    // Wait for the dashboard to render the new panel, then scroll
    const scrollTimeoutId = setTimeout(() => {
      const selector = `.dshDashboardGrid__item[id="panel-${lastCreatedPanelId}"]`;
      const panelElement = dashboardContainerRef.current?.querySelector(selector);
      if (panelElement) {
        panelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Auto-clear the highlight after 3 seconds
    const clearHighlightTimeoutId = setTimeout(() => {
      setLastCreatedPanelId(null);
    }, 3000);

    return () => {
      clearTimeout(scrollTimeoutId);
      clearTimeout(clearHighlightTimeoutId);
    };
  }, [lastCreatedPanelId, version]);

  // Subscribe to attachment store for state updates
  useEffect(() => {
    const subscription = attachmentStore.state.subscribe((state) => {
      if (state?.attachmentId === attachmentId && state.data) {
        // Only update confirmed panel IDs when we receive a confirmed attachment update
        if (state.isConfirmed) {
          setConfirmedPanelIds(new Set(state.data.panels.map((p) => p.panelId)));
          // Clear highlight when panels are confirmed
          setLastCreatedPanelId(null);
        }

        const panelsChanged = !arePanelsEqual(currentPanelsRef.current, state.data.panels);

        // Find newly added panels (panels in new state but not in current)
        const currentIds = new Set(currentPanelsRef.current.map((p) => p.panelId));
        const newPanels = state.data.panels.filter((p) => !currentIds.has(p.panelId));

        if (panelsChanged) {
          currentPanelsRef.current = state.data.panels;
        }

        setData(state.data);

        // Remount dashboard when panel composition changes.
        if (panelsChanged) {
          // If there are new panels, highlight the last one added
          if (newPanels.length > 0) {
            const lastNewPanel = newPanels[newPanels.length - 1];
            setLastCreatedPanelId(lastNewPanel.panelId);
          }
          setVersion((v) => v + 1);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [attachmentStore, attachmentId]);

  const initialDashboardInput = useMemo<DashboardFlyoutInitialInput>(
    () => ({
      timeRange: { from: 'now-24h', to: 'now' },
      viewMode: 'view' as const,
      panels: normalizePanels(panels ?? []) as DashboardState['panels'],
      title,
      description,
    }),
    [panels, title, description]
  );

  const getCreationOptions = useCallback(async () => {
    // If we have a savedObjectId, load from saved dashboard and just set viewMode
    // Otherwise, use by-value panels from the attachment data
    if (savedObjectId) {
      return {
        getInitialInput: () => ({
          viewMode: 'view' as const,
        }),
      };
    }

    return {
      getInitialInput: () => ({
        ...initialDashboardInput,
      }),
    };
  }, [savedObjectId, initialDashboardInput]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={styles.header}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="dashboardFlyoutTitle">
                {title ||
                  i18n.translate('xpack.dashboardAgent.flyout.defaultTitle', {
                    defaultMessage: 'Dashboard Preview',
                  })}
              </h2>
            </EuiTitle>
            {description && (
              <EuiText size="s" color="subdued">
                {description}
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={styles.body}>
        <div ref={dashboardContainerRef} css={styles.dashboardContainer(unconfirmedPanelStyles)}>
          <DashboardRenderer
            key={version}
            getCreationOptions={getCreationOptions}
            showPlainSpinner
            savedObjectId={savedObjectId}
            onApiAvailable={(api) => {
              // Force view mode since DashboardRenderer defaults to edit when no savedObjectId
              api.setViewMode('view');
            }}
          />
        </div>
      </EuiFlyoutBody>

      <DashboardFlyoutFooter
        onClose={onClose}
        share={share}
        savedObjectId={savedObjectId}
        initialDashboardInput={initialDashboardInput}
      />
    </>
  );
};
