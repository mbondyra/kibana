/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExpressions, getExpressionsSetup, getVegaVisualizationDependencies } from '../services';

let registrationPromise: Promise<void> | undefined;

/**
 * The Vega expression function and renderer are normally registered lazily by the legacy
 * `visualization` embeddable when a Vega vis is first rendered. The dedicated Vega embeddable
 * does not go through that path, so it must ensure the expression pipeline is registered itself.
 * Registration happens at most once per page load.
 */
export const ensureVegaRenderable = async (): Promise<void> => {
  if (getExpressions().getFunction('vega')) {
    return;
  }

  if (!registrationPromise) {
    registrationPromise = (async () => {
      const { createVegaFn, getVegaVisRenderer } = await import('../async_module');
      const dependencies = getVegaVisualizationDependencies();
      const expressionsSetup = getExpressionsSetup();
      expressionsSetup.registerFunction(() => createVegaFn(dependencies));
      expressionsSetup.registerRenderer(getVegaVisRenderer(dependencies));
    })();
  }

  await registrationPromise;
};
