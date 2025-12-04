/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';

interface DashboardFlyoutProps {
  dashboardId: string;
  dashboardTitle: string;
  dashboardUrl?: string;
  ariaLabelledBy: string;
  closeFlyout: () => void;
}

export const DashboardFlyout: React.FC<DashboardFlyoutProps> = ({
  dashboardId,
  dashboardTitle,
  dashboardUrl,
  ariaLabelledBy,
  closeFlyout,
}) => {
  const handleOpenFullPage = () => {
    if (dashboardUrl) {
      window.open(dashboardUrl, '_blank');
    }
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>{dashboardTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DashboardRenderer
          savedObjectId={dashboardId}
          getCreationOptions={async () => ({
            getInitialInput: () => ({
              viewMode: 'view',
              timeRange: { from: 'now-30d', to: 'now' },
            }),
          })}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={closeFlyout}>
              {i18n.translate('xpack.onechat.dashboardFlyout.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          </EuiFlexItem>
          {dashboardUrl && (
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleOpenFullPage} iconType="popout" iconSide="right" fill>
                {i18n.translate('xpack.onechat.dashboardFlyout.openFullPageButton', {
                  defaultMessage: 'Open in dashboards',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

