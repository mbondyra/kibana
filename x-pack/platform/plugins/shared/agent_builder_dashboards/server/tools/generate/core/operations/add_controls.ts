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
import type { DashboardPinnedPanel } from '@kbn/as-code-dashboard-schema';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import { z } from '@kbn/zod/v4';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import type { PanelFailure } from '../utils';
import { defineOperation } from './types';

const controlWidthSchema = z.enum(['small', 'medium', 'large']).describe('Defaults to medium.');

const controlInputSchema = z
  .object({
    type: z.enum([OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL, TIME_SLIDER_CONTROL]),
    field_name: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Exact field name used by the panel queries. Required except for time_slider_control.'
      ),
    index: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Index, alias or data stream to query for values. Required except for time_slider_control.'
      ),
    title: z.string().max(256).optional().describe('Label shown above the control.'),
    width: controlWidthSchema.optional(),
    grow: z.boolean().optional().describe('Fill available width. Defaults to true.'),
  })
  .check((payload) => {
    const { type, field_name: fieldName, index } = payload.value;
    if (type !== TIME_SLIDER_CONTROL && (fieldName === undefined || index === undefined)) {
      payload.issues.push({
        code: 'custom',
        message: `${type} requires field_name and index.`,
        input: payload.value,
      });
    }
  });

type ControlInput = z.infer<typeof controlInputSchema>;

const dataControlFieldsOf = (
  control: ControlInput
): { fieldName: string; index: string; title?: string } => {
  const { field_name: fieldName, index, title } = control;
  if (fieldName === undefined || index === undefined) {
    throw new Error(`${control.type} requires field_name and index.`);
  }
  return { fieldName, index, title };
};

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

  const { fieldName, index, title } = dataControlFieldsOf(control);

  if (type === OPTIONS_LIST_CONTROL) {
    const config = {
      ...DEFAULT_DSL_OPTIONS_LIST_STATE,
      ...(title !== undefined ? { title } : {}),
      values_source: ControlValuesSource.ESQL,
      esql_query: `FROM ${index} | STATS BY ${formatEsqlIdentifier(fieldName)}`,
    } satisfies Extract<DashboardPinnedPanel, { type: typeof OPTIONS_LIST_CONTROL }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  const config = {
    ...DEFAULT_RANGE_SLIDER_STATE,
    ...(title !== undefined ? { title } : {}),
    values_source: ControlValuesSource.ESQL,
    esql_query: `FROM ${index} | STATS BY ${formatEsqlIdentifier(fieldName)}`,
  } satisfies Extract<DashboardPinnedPanel, { type: typeof RANGE_SLIDER_CONTROL }>['config'];

  return {
    type,
    id,
    width,
    grow,
    config,
  };
};

export const addControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_controls'),
    controls: z
      .array(controlInputSchema)
      .min(1)
      .describe(
        'options_list_control for keyword fields, range_slider_control for numeric fields, time_slider_control (at most one) for time sub-ranges.'
      ),
  }),
  handler: ({ dashboardData, operation, context }) => {
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
