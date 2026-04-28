/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VisualizationActionHandlers } from './base_visualization';
import { dashboardWriteControlsDisabledReason, saveButtonLabel } from './edit_visualization_button';

const HEADER_HEIGHT = 72;

export const visualizationTitle = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.title',
  {
    defaultMessage: 'Visualization',
  }
);

const viewConfigurationLabel = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.viewConfigurationActionLabel',
  {
    defaultMessage: 'View configuration',
  }
);

const wrapDisabledButton = (disabledReason: string | undefined, button: React.ReactElement) => {
  if (!disabledReason) {
    return button;
  }

  return (
    <EuiToolTip content={disabledReason}>
      <span tabIndex={0}>{button}</span>
    </EuiToolTip>
  );
};

export function VisualizationHeader({
  actionHandlers,
}: {
  actionHandlers?: VisualizationActionHandlers;
}) {
  const { euiTheme } = useEuiTheme();
  const isDisabled = !actionHandlers || !actionHandlers.canWriteDashboards;
  const disabledReason =
    actionHandlers && !actionHandlers.canWriteDashboards
      ? dashboardWriteControlsDisabledReason
      : undefined;

  const onViewConfiguration = useCallback(() => {
    actionHandlers?.viewConfiguration();
  }, [actionHandlers]);

  const onSaveToDashboard = useCallback(() => {
    actionHandlers?.saveToDashboard();
  }, [actionHandlers]);

  const textStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;

  const headerStyles = css`
    position: relative;
    display: flex;
    align-items: center;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    min-height: ${HEADER_HEIGHT}px;
  `;

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      <EuiFlexGroup
        responsive={false}
        justifyContent="spaceBetween"
        alignItems="center"
        style={{ width: '100%' }}
      >
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <EuiText css={textStyles} size="s">
            {visualizationTitle}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              {wrapDisabledButton(
                disabledReason,
                <EuiButtonEmpty
                  color="text"
                  size="s"
                  iconType="pencil"
                  onClick={onViewConfiguration}
                  isDisabled={isDisabled}
                >
                  {viewConfigurationLabel}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {wrapDisabledButton(
                disabledReason,
                <EuiButton
                  color="text"
                  size="s"
                  iconType="save"
                  onClick={onSaveToDashboard}
                  isDisabled={isDisabled}
                >
                  {saveButtonLabel}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
}
