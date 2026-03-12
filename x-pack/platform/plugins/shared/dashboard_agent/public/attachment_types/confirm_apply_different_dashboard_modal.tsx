/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFocusTrap,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOutsideClickDetector,
  EuiText,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

export const openConfirmApplyDifferentDashboardModal = ({
  core,
  onApply,
}: {
  core: CoreStart;
  onApply: () => void;
}) => {
  const titleId = 'dashboardAgentConfirmApplyDifferentDashboardTitle';
  const descriptionId = 'dashboardAgentConfirmApplyDifferentDashboardDescription';
  const modalSession = core.overlays.openModal(
    toMountPoint(
      <EuiFocusTrap clickOutsideDisables={true} initialFocus=".dashboardAgentApplyButton">
        <EuiOutsideClickDetector onOutsideClick={() => modalSession.close()}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle id={titleId} component="h2">
                {i18n.translate(
                  'xpack.dashboardAgent.attachments.dashboard.applyToDifferentDashboard.confirmTitle',
                  {
                    defaultMessage: 'Apply changes from another dashboard?',
                  }
                )}
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiText>
                <p id={descriptionId}>
                  {i18n.translate(
                    'xpack.dashboardAgent.attachments.dashboard.applyToDifferentDashboard.confirmBody',
                    {
                      defaultMessage:
                        'This attachment is linked to a different dashboard. Applying it will overwrite the dashboard currently open in the editor.',
                    }
                  )}
                </p>
              </EuiText>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={() => modalSession.close()}>
                {i18n.translate(
                  'xpack.dashboardAgent.attachments.dashboard.applyToDifferentDashboard.cancelButton',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButtonEmpty>
              {/* <EuiButtonEmpty
                onClick={() => {
                  onOpenInFlyout();
                  modalSession.close();
                }}
              >
                {i18n.translate(
                  'xpack.dashboardAgent.attachments.dashboard.applyToDifferentDashboard.openInFlyoutButton',
                  {
                    defaultMessage: 'Preview',
                  }
                )}
              </EuiButtonEmpty> */}
              <EuiButton
                color="danger"
                fill
                className="dashboardAgentApplyButton"
                onClick={() => {
                  onApply();
                  modalSession.close();
                }}
              >
                {i18n.translate(
                  'xpack.dashboardAgent.attachments.dashboard.applyToDifferentDashboard.confirmButton',
                  {
                    defaultMessage: 'Apply and overwrite',
                  }
                )}
              </EuiButton>
            </EuiModalFooter>
          </div>
        </EuiOutsideClickDetector>
      </EuiFocusTrap>,
      core
    ),
    {
      maxWidth: 600,
      'data-test-subj': 'dashboardAgentApplyDifferentDashboardModal',
    }
  );
};
