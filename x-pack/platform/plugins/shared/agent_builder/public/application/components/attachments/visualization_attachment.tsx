/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core/public';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';
import type { VisualizationActionHandlers } from '../tools/esql/shared/base_visualization';
import { dashboardWriteControlsDisabledReason } from '../tools/esql/shared/edit_visualization_button';

const LazyVisualizeLens = React.lazy(() =>
  import('../tools/esql/visualize_lens').then((m) => ({ default: m.VisualizeLens }))
);

const visualizationAttachmentActions = new Map<string, VisualizationActionHandlers>();

const VisualizationContent: React.FC<
  AttachmentRenderProps<VisualizationAttachment> & {
    startDependencies: AgentBuilderStartDependencies;
  }
> = ({ attachment, startDependencies }) => {
  const updateActionHandlers = useCallback(
    (handlers: VisualizationActionHandlers | undefined) => {
      if (handlers) {
        visualizationAttachmentActions.set(attachment.id, handlers);
        return;
      }
      visualizationAttachmentActions.delete(attachment.id);
    },
    [attachment.id]
  );

  useEffect(() => {
    return () => {
      visualizationAttachmentActions.delete(attachment.id);
    };
  }, [attachment.id]);

  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LazyVisualizeLens
        lensConfig={attachment.data.visualization}
        dataViews={startDependencies.dataViews}
        lens={startDependencies.lens}
        uiActions={startDependencies.uiActions}
        timeRange={attachment.data.time_range}
        onActionHandlersChange={updateActionHandlers}
      />
    </Suspense>
  );
};

/**
 * Factory function that creates the visualization attachment UI definition.
 * Reuses the existing VisualizeLens component used for visualization tool results.
 */
export const createVisualizationAttachmentDefinition = ({
  startDependencies,
  application,
}: {
  startDependencies: AgentBuilderStartDependencies;
  application: ApplicationStart;
}): AttachmentUIDefinition<VisualizationAttachment> => {
  return {
    getLabel: (attachment: VisualizationAttachment): string => {
      const { title } = attachment.data.visualization;
      return typeof title === 'string' && title.trim()
        ? title
        : i18n.translate('xpack.agentBuilder.attachments.visualization.label', {
            defaultMessage: 'Visualization',
          });
    },
    getIcon: () => 'lensApp',
    renderInlineContent: (props) => (
      <VisualizationContent {...props} startDependencies={startDependencies} />
    ),
    getActionButtons: ({ attachment, isCanvas }) => {
      console.log('attachment', attachment);
      if (isCanvas) {
        return [];
      }

      const canWriteDashboards = application.capabilities.dashboard_v2?.showWriteControls === true;
      const disabledReason = canWriteDashboards ? undefined : dashboardWriteControlsDisabledReason;

      return [
        {
          label: i18n.translate(
            'xpack.agentBuilder.attachments.visualization.viewConfigurationActionLabel',
            {
              defaultMessage: 'View configuration',
            }
          ),
          type: ActionButtonType.SECONDARY,
          disabled: !canWriteDashboards,
          disabledReason,
          handler: () => visualizationAttachmentActions.get(attachment.id)?.viewConfiguration(),
        },
        {
          label: i18n.translate('xpack.agentBuilder.conversation.visualization.saveToDashboard', {
            defaultMessage: 'Save to dashboard',
          }),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          disabled: !canWriteDashboards,
          disabledReason,
          handler: () => visualizationAttachmentActions.get(attachment.id)?.saveToDashboard(),
        },
      ];
    },
  };
};
