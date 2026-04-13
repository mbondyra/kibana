/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import {
  LENS_EMBEDDABLE_TYPE,
  type LensAppServices,
  type LensSerializedState,
} from '@kbn/lens-common';

export const buildEmbeddablePackagesForLensDashboardRedirect = ({
  embeddableInput,
  controlsState,
}: {
  embeddableInput: LensSerializedState;
  controlsState?: ControlPanelsState;
}): EmbeddablePackageState[] => {
  const embeddablePackages: EmbeddablePackageState[] = [
    {
      type: LENS_EMBEDDABLE_TYPE,
      serializedState: embeddableInput,
    },
  ];

  Object.values(controlsState ?? {}).forEach((control) => {
    embeddablePackages.push({
      type: control.type,
      serializedState: {
        ...omit(control, ['type', 'order', 'width', 'grow']), // add as panel rather than pinned, so strip out unnecessary info
      },
    });
  });

  return embeddablePackages;
};

export const redirectToDashboard = ({
  embeddableInput,
  dashboardId,
  originatingApp,
  getOriginatingPath,
  stateTransfer,
  controlsState,
}: {
  embeddableInput: LensSerializedState;
  dashboardId: string;
  originatingApp?: string;
  getOriginatingPath?: (dashboardId: string) => string | undefined;
  stateTransfer: LensAppServices['stateTransfer'];
  controlsState?: ControlPanelsState;
}) => {
  const appId = originatingApp || 'dashboards';

  const embeddablePackages = buildEmbeddablePackagesForLensDashboardRedirect({
    embeddableInput,
    controlsState,
  });

  stateTransfer.navigateToWithEmbeddablePackages(appId, {
    state: embeddablePackages,
    path:
      getOriginatingPath?.(dashboardId) ??
      (dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`),
  });
};
