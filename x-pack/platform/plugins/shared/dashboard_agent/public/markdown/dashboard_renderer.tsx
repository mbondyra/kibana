/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiText } from '@elastic/eui';
import { findToolResult } from '@kbn/onechat-plugin/public';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import {
  ToolResultType,
  type DashboardResult,
} from '@kbn/onechat-common/tools/tool_result';
import { dashboardElement } from '../../common';
import { DashboardCard } from '../components/dashboard_card';

export function createDashboardRenderer({
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: { toolResultId?: string }) => {
    const { toolResultId } = props;

    if (!toolResultId) {
      return <EuiText>Dashboard missing {dashboardElement.attributes.toolResultId}.</EuiText>;
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];
    const toolResult = findToolResult<DashboardResult>(
      steps,
      toolResultId,
      ToolResultType.dashboard
    );

    if (!toolResult) {
      const ToolResultAttribute = (
        <EuiCode>
          {dashboardElement.attributes.toolResultId}={toolResultId}
        </EuiCode>
      );
      return <EuiText>Unable to find dashboard for {ToolResultAttribute}.</EuiText>;
    }

    const { title, content, id } = toolResult.data;
    const dashboardUrl = content?.url as string | undefined;

    return <DashboardCard title={title || 'Dashboard'} url={dashboardUrl} dashboardId={id} />;
  };
}

