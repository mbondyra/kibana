/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { CoreSetup } from 'src/core/public';
import { FormatFactory } from '../legacy_imports';
import { pieVisualization } from './visualization';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import { pie, getPieRenderer } from './expression';
import { EditorFrameSetup } from '../types';

export interface PieVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
}

export class PieVisualization {
  constructor() {}

  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame }: PieVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => pie);

    expressions.registerRenderer(
      getPieRenderer({
        formatFactory,
        chartTheme: core.uiSettings.get<boolean>('theme:darkMode')
          ? EUI_CHARTS_THEME_DARK.theme
          : EUI_CHARTS_THEME_LIGHT.theme,
      })
    );

    editorFrame.registerVisualization(pieVisualization);
  }

  stop() {}
}
