/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { defineOperation } from './types';

const CONTROL_PANEL_TYPES = new Set<string>([
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
]);

export const removeControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('remove_controls'),
    control_ids: z
      .array(z.string())
      .min(1)
      .describe(
        'IDs of controls to remove (from the controls[] list in the tool result). Works for both pinned and section-scoped controls.'
      ),
  }),
  handler: ({ dashboardData, operation }) => {
    const idsToRemove = new Set(operation.control_ids);

    const isRemovableControlPanel = (panel: { id: string; type: string }): boolean =>
      idsToRemove.has(panel.id) && CONTROL_PANEL_TYPES.has(panel.type);

    const panels = dashboardData.panels
      .map((widget) => {
        if (isSection(widget)) {
          return {
            ...widget,
            panels: widget.panels.filter((panel) => !isRemovableControlPanel(panel)),
          };
        }
        return widget;
      })
      .filter((widget) => isSection(widget) || !isRemovableControlPanel(widget));

    return {
      ...dashboardData,
      panels,
      pinned_panels: (dashboardData.pinned_panels ?? []).filter(
        (control) => !idsToRemove.has((control as { id?: string }).id ?? '')
      ),
    };
  },
});
