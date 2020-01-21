/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { CoreSetup } from 'src/core/public';
import { getFormat, FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { pieVisualization } from './visualization';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import { pie, pieColumns, getPieRenderer } from './expression';

export interface PieVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  // TODO this is a simulated NP plugin.
  // Once field formatters are actually migrated, the actual shim can be used
  fieldFormat: {
    formatFactory: FormatFactory;
  };
}

class PieVisualizationPlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { expressions, fieldFormat }: PieVisualizationPluginSetupPlugins) {
    expressions.registerFunction(() => pieColumns);
    expressions.registerFunction(() => pie);
    expressions.registerRenderer(() => getPieRenderer(fieldFormat.formatFactory));

    return pieVisualization;
  }

  stop() {}
}

const plugin = new PieVisualizationPlugin();

export const pieVisualizationSetup = () =>
  plugin.setup(npSetup.core, {
    expressions: npSetup.plugins.expressions,
    fieldFormat: {
      formatFactory: getFormat,
    },
  });
export const pieVisualizationStop = () => plugin.stop();
