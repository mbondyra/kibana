/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultEmbeddableApi, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type {
  HasSupportedTriggers,
  PublishesDataLoading,
  PublishesWritableTitle,
} from '@kbn/presentation-publishing';
import type { PublishesWritableTimeRange } from '@kbn/presentation-publishing/interfaces/fetch/publishes_unified_search';
import type { VegaEmbeddableState } from '../../server';

export type VegaEmbeddableApi = DefaultEmbeddableApi<VegaEmbeddableState> &
  PublishesWritableTitle &
  PublishesWritableTimeRange &
  PublishesDataLoading &
  HasSupportedTriggers &
  HasDrilldowns;
