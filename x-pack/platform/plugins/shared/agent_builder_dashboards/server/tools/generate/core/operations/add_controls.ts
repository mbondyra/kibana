/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ControlValuesSource,
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_RANGE_SLIDER_STATE,
  DEFAULT_TIME_SLIDER_STATE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { DashboardPinnedPanel } from '@kbn/dashboard-plugin/server';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import type { PanelFailure } from '../utils';
import { findSectionIndex } from '../dashboard_state';
import { defineOperation } from './types';

// Grid dimensions used for in-grid controls, matching the dashboard's own
// unpin-to-grid behavior (see dashboard layout_manager `unpinPanel`).
const CONTROL_GRID_WIDTH = 12;
const CONTROL_GRID_HEIGHT = 2;
const DASHBOARD_GRID_COLUMNS = 48;

const controlWidthSchema = z
  .enum(['small', 'medium', 'large'])
  .describe('Control width. Defaults to "medium".');

const dataControlFields = {
  field_name: z
    .string()
    .min(1)
    .describe('Exact field name as it appears in the panel ES|QL queries (e.g. "service.name").'),
  index: z
    .string()
    .min(1)
    .describe('Index, alias, or datastream to query for values (e.g. "logs-*").'),
};

const controlLayoutFields = {
  width: controlWidthSchema.optional(),
  grow: z
    .boolean()
    .optional()
    .describe('Expand to fill available horizontal space. Defaults to true.'),
};

const dataControlInputFields = {
  ...dataControlFields,
  title: z.string().optional().describe('Human-readable label shown above the control.'),
  ...controlLayoutFields,
};

const optionsListControlInputSchema = z.object({
  type: z.literal(OPTIONS_LIST_CONTROL),
  ...dataControlInputFields,
});

const rangeSliderControlInputSchema = z.object({
  type: z.literal(RANGE_SLIDER_CONTROL),
  ...dataControlInputFields,
});

const timeSliderControlInputSchema = z.object({
  type: z.literal(TIME_SLIDER_CONTROL),
  ...controlLayoutFields,
});

const controlInputSchema = z.discriminatedUnion('type', [
  optionsListControlInputSchema,
  rangeSliderControlInputSchema,
  timeSliderControlInputSchema,
]);

type ControlInput = z.infer<typeof controlInputSchema>;

const filterDuplicateTimeSliders = ({
  existingControls,
  controlsToAdd,
  failures,
}: {
  existingControls: Array<{ type?: string }>;
  controlsToAdd: ControlInput[];
  failures: PanelFailure[];
}): ControlInput[] => {
  const hasTimeSlider = existingControls.some((control) => control.type === TIME_SLIDER_CONTROL);
  let canAddTimeSlider = !hasTimeSlider;

  return controlsToAdd.filter((control, controlInputIndex) => {
    if (control.type !== TIME_SLIDER_CONTROL) {
      return true;
    }

    if (canAddTimeSlider) {
      canAddTimeSlider = false;
      return true;
    }

    failures.push({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
      identifier: `controls[${controlInputIndex}]`,
      error: 'A dashboard can contain at most one time_slider_control.',
    });
    return false;
  });
};

const buildStoredControl = (control: ControlInput): DashboardPinnedPanel => {
  const { type, width = 'medium', grow = true } = control;
  const id = uuidv4();

  if (type === TIME_SLIDER_CONTROL) {
    const config = {
      ...DEFAULT_TIME_SLIDER_STATE,
    } satisfies Extract<DashboardPinnedPanel, { type: typeof TIME_SLIDER_CONTROL }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  if (type === OPTIONS_LIST_CONTROL) {
    const { field_name, index, title } = control;
    const config = {
      ...DEFAULT_DSL_OPTIONS_LIST_STATE,
      ...(title !== undefined ? { title } : {}),
      values_source: ControlValuesSource.ESQL,
      esql_query: `FROM ${index} | STATS BY ${field_name}`,
    } satisfies Extract<DashboardPinnedPanel, { type: typeof OPTIONS_LIST_CONTROL }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  const { field_name, index, title } = control;
  const config = {
    ...DEFAULT_RANGE_SLIDER_STATE,
    ...(title !== undefined ? { title } : {}),
    values_source: ControlValuesSource.ESQL,
    esql_query: `FROM ${index} | STATS BY ${field_name}`,
  } satisfies Extract<DashboardPinnedPanel, { type: typeof RANGE_SLIDER_CONTROL }>['config'];

  return {
    type,
    id,
    width,
    grow,
    config,
  };
};

const buildGridControl = (
  control: ControlInput,
  grid: AttachmentPanel['grid']
): AttachmentPanel => {
  const { type, config } = buildStoredControl(control);
  return { type, id: uuidv4(), config: config as AttachmentPanel['config'], grid };
};

/**
 * Lays out controls as a row (or rows) of grid panels anchored at the top of a
 * section (section-relative coordinates), wrapping to a new row when the
 * dashboard grid width is exceeded. Returns the built panels and the total
 * vertical space they occupy so existing section content can be shifted down.
 */
const layoutSectionControls = (
  controls: ControlInput[]
): { controlPanels: AttachmentPanel[]; occupiedHeight: number } => {
  let x = 0;
  let y = 0;
  const controlPanels = controls.map((control) => {
    if (x + CONTROL_GRID_WIDTH > DASHBOARD_GRID_COLUMNS) {
      x = 0;
      y += CONTROL_GRID_HEIGHT;
    }
    const grid = { x, y, w: CONTROL_GRID_WIDTH, h: CONTROL_GRID_HEIGHT };
    x += CONTROL_GRID_WIDTH;
    return buildGridControl(control, grid);
  });

  return { controlPanels, occupiedHeight: y + CONTROL_GRID_HEIGHT };
};

/**
 * Time sliders act on the global time range, so they only make sense as pinned
 * controls. Section-scoping them is rejected with a per-control failure.
 */
const rejectSectionTimeSliders = ({
  controls,
  failures,
}: {
  controls: ControlInput[];
  failures: PanelFailure[];
}): ControlInput[] => {
  return controls.filter((control, controlInputIndex) => {
    if (control.type !== TIME_SLIDER_CONTROL) {
      return true;
    }

    failures.push({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
      identifier: `controls[${controlInputIndex}]`,
      error:
        'time_slider_control cannot be scoped to a section; add it as a pinned control instead.',
    });
    return false;
  });
};

const addSectionScopedControls = ({
  dashboardData,
  controls,
  sectionId,
  failures,
}: {
  dashboardData: DashboardAttachmentData;
  controls: ControlInput[];
  sectionId: string;
  failures: PanelFailure[];
}): DashboardAttachmentData => {
  if (findSectionIndex(dashboardData.panels, sectionId) === -1) {
    failures.push({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
      identifier: `section:${sectionId}`,
      error: `Section "${sectionId}" not found. Add controls to an existing section or pin them.`,
    });
    return dashboardData;
  }

  const controlsToAdd = rejectSectionTimeSliders({ controls, failures });
  if (controlsToAdd.length === 0) {
    return dashboardData;
  }

  const { controlPanels, occupiedHeight } = layoutSectionControls(controlsToAdd);

  return {
    ...dashboardData,
    panels: dashboardData.panels.map((widget) => {
      if (!isSection(widget) || widget.id !== sectionId) {
        return widget;
      }

      // Controls go to the top of the section; push existing content down to make room.
      const shiftedPanels = widget.panels.map((panel) => ({
        ...panel,
        grid: { ...panel.grid, y: panel.grid.y + occupiedHeight },
      }));

      return {
        ...widget,
        panels: [...controlPanels, ...shiftedPanels],
      };
    }),
  };
};

export const addControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_controls'),
    controls: z
      .array(controlInputSchema)
      .min(1)
      .describe(
        'Controls to append. Use options_list_control for categorical/keyword fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard).'
      ),
    section_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional section id. When set, controls are placed inside that section and only filter that section's panels. Omit to pin controls above the dashboard (global). time_slider_control cannot be section-scoped."
      ),
  }),
  handler: ({ dashboardData, operation, context }) => {
    if (operation.section_id) {
      return addSectionScopedControls({
        dashboardData,
        controls: operation.controls,
        sectionId: operation.section_id,
        failures: context.failures,
      });
    }

    const existingControls = dashboardData.pinned_panels ?? [];
    const controlsToAdd = filterDuplicateTimeSliders({
      existingControls,
      controlsToAdd: operation.controls,
      failures: context.failures,
    });

    const newControls = controlsToAdd.map(buildStoredControl);
    return {
      ...dashboardData,
      pinned_panels: [...existingControls, ...newControls],
    };
  },
});
