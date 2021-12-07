/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ThemeServiceStart } from '../../../../../core/public';
import { KibanaThemeProvider } from '../../../../kibana_react/public';
import { ExpressionRenderDefinition } from '../../../../expressions/common/expression_renderers';
import { EXPRESSION_GAUGE_NAME, GaugeExpressionProps } from '../../common';
import { getFormatService, getPaletteService, getThemeService } from '../services';

import GaugeComponent from '../components/gauge_component';
import './index.scss';
const MemoizedChart = memo(GaugeComponent);

interface ExpressioGaugeRendererDependencies {
  theme: ThemeServiceStart;
}

export const gaugeRenderer: (
  deps: ExpressioGaugeRendererDependencies
) => ExpressionRenderDefinition<GaugeExpressionProps> = ({ theme }) => ({
  name: EXPRESSION_GAUGE_NAME,
  displayName: i18n.translate('expressionGauge.visualizationName', {
    defaultMessage: 'Gauge',
  }),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <div className="gauge-container" data-test-subj="gaugeChart">
          <MemoizedChart
            {...config}
            formatFactory={getFormatService().deserialize}
            chartsThemeService={getThemeService()}
            paletteService={getPaletteService()}
          />
        </div>
      </KibanaThemeProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
  },
});
