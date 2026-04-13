/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAppServices } from '@kbn/lens-common';

export type LensDashboardInPlaceSaveHandler = NonNullable<
  LensAppServices['tryAddEmbeddablePackagesToOpenDashboard']
>;

let handler: LensDashboardInPlaceSaveHandler | undefined;

export function registerLensDashboardInPlaceSaveHandler(
  next: LensDashboardInPlaceSaveHandler | undefined
): void {
  handler = next;
}

export function getLensDashboardInPlaceSaveHandler(): LensDashboardInPlaceSaveHandler | undefined {
  return handler;
}
