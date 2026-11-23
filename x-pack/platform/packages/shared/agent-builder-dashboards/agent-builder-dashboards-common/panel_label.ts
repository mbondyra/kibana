/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLensConfigLabel } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { AttachmentPanel, DashboardAttachmentData } from './types';
import { isSection } from './types';

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

/** The panel title, else a label derived from an ES|QL Lens config. */
export const getPanelLabel = (
  panel: Pick<AttachmentPanel, 'type' | 'config'>
): string | undefined => {
  const title = nonEmptyString(panel.config.title);
  if (title) {
    return title;
  }
  return panel.type === LENS_EMBEDDABLE_TYPE ? getLensConfigLabel(panel.config) : undefined;
};

/** Finds a panel by id at the top level or inside a section. */
export const findPanelById = (
  panels: DashboardAttachmentData['panels'],
  panelId: string
): AttachmentPanel | undefined => {
  for (const widget of panels) {
    if (isSection(widget)) {
      const panel = widget.panels.find(({ id }) => id === panelId);
      if (panel) {
        return panel;
      }
    } else if (widget.id === panelId) {
      return widget;
    }
  }
  return undefined;
};
