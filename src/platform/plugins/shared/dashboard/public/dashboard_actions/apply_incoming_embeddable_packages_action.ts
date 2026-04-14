/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { getActiveDashboardForIncomingEmbeddablePackages } from '../dashboard_app/active_dashboard_for_state_transfer';
import { coreServices } from '../services/kibana_services';
import { ACTION_APPLY_INCOMING_EMBEDDABLE_PACKAGES_FROM_STATE_TRANSFER } from './constants';

export interface ApplyIncomingEmbeddablePackagesContext {
  destinationAppId: string;
  stateTransfer: EmbeddableStateTransfer;
}

export class ApplyIncomingEmbeddablePackagesAction
  implements Action<ApplyIncomingEmbeddablePackagesContext>
{
  public readonly type = ACTION_APPLY_INCOMING_EMBEDDABLE_PACKAGES_FROM_STATE_TRANSFER;
  public readonly id = ACTION_APPLY_INCOMING_EMBEDDABLE_PACKAGES_FROM_STATE_TRANSFER;

  public getDisplayName() {
    return i18n.translate('dashboard.applyIncomingEmbeddablePackagesAction.displayName', {
      defaultMessage: 'Apply incoming embeddable packages',
    });
  }

  public async isCompatible(context: ApplyIncomingEmbeddablePackagesContext) {
    if (context.destinationAppId !== DASHBOARD_APP_ID) {
      return false;
    }
    const dashboardApi = getActiveDashboardForIncomingEmbeddablePackages();
    return Boolean(
      dashboardApi?.isEditableByUser &&
        context.stateTransfer &&
        typeof context.stateTransfer.getIncomingEmbeddablePackage === 'function'
    );
  }

  public async execute(context: ApplyIncomingEmbeddablePackagesContext) {
    if (!(await this.isCompatible(context))) {
      throw new IncompatibleActionError();
    }
    const dashboardApi = getActiveDashboardForIncomingEmbeddablePackages()!;
    const packages = context.stateTransfer.getIncomingEmbeddablePackage(DASHBOARD_APP_ID, true);
    if (!packages?.length) {
      return;
    }
    try {
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const isLast = i === packages.length - 1;
        await dashboardApi.addNewPanel(
          {
            panelType: pkg.type,
            serializedState: pkg.serializedState,
          },
          { displaySuccessMessage: isLast, scrollToPanel: isLast }
        );
      }
    } catch (error) {
      coreServices.notifications.toasts.addDanger({
        title: i18n.translate('dashboard.embeddableStateTransfer.applyIncomingPanelsErrorTitle', {
          defaultMessage: 'Could not add panels from navigation state',
        }),
        body: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
