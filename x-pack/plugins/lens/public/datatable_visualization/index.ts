/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import { datatableVisualization } from './visualization';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { datatable, datatableColumns, getDatatableRenderer } from './expression';
import { EditorFrameSetup, FormatFactory } from '../types';
import { setExecuteTriggerActions } from '../services';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';

interface DatatableVisualizationPluginStartPlugins {
  uiActions: UiActionsStart;
}
export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
}

export class DatatableVisualization {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory, editorFrame }: DatatableVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => datatableColumns);
    expressions.registerFunction(() => datatable);
    expressions.registerRenderer(() => getDatatableRenderer(formatFactory));
    editorFrame.registerVisualization(datatableVisualization);
  }
  start(core: CoreStart, { uiActions }: DatatableVisualizationPluginStartPlugins) {
    setExecuteTriggerActions(uiActions.executeTriggerActions);
  }
}
