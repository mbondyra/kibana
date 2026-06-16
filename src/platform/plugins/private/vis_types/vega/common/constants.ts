/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';

/**
 * Panel type for the dedicated Vega embeddable. Distinct from the legacy `visualization`
 * embeddable that multiplexes all vis types via `savedVis`.
 */
export const VEGA_EMBEDDABLE_TYPE = 'vega';

/**
 * The Vega visualization type name as stored inside a legacy `visualization` embeddable's
 * `savedVis.type`. Used to recognize legacy by-value Vega panels for back-compat transforms.
 */
export const VEGA_VIS_TYPE = 'vega';

/**
 * Drilldown triggers supported by Vega visualizations. Vega only emits "apply filter" events.
 */
export const VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS = [ON_APPLY_FILTER];
