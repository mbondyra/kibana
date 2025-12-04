/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { openLazyFlyout } from '@kbn/presentation-util';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

export const DashboardCard: React.FC<{
  title: string;
  url?: string;
  dashboardId: string;
}> = ({ title, url, dashboardId }) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<CoreStart>();

  const handleClick = () => {
    openLazyFlyout({
      core: services,
      loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
        const { DashboardFlyout } = await import('./dashboard_flyout');
        return (
          <DashboardFlyout
            dashboardId={dashboardId}
            dashboardTitle={title}
            dashboardUrl={url}
            ariaLabelledBy={ariaLabelledBy}
            closeFlyout={closeFlyout}
          />
        );
      },
      flyoutProps: {
        isResizable: true,
        size: 'm',
        type: 'push',
      },
    });
  };

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xxl};
    height: ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.primary};
  `;

  const panelStyles = css`
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    &:active {
      transform: translateY(0);
    }
  `;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`Open dashboard: ${title}`}
    >
      <EuiPanel hasShadow={false} paddingSize="m" color="primary" className={panelStyles}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <div className={iconContainerStyles}>
              <EuiIcon type="dashboardApp" size="l" color="ghost" />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="default">
              <strong>{title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              Dashboard (Temporary)
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};

