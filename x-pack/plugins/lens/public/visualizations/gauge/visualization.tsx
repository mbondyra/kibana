/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { Ast } from '@kbn/interpreter/common';
import { PaletteRegistry } from '../../../../../../src/plugins/charts/public';
import type { OperationMetadata, Visualization } from '../../types';
import type { GaugeVisualizationState } from './types';
import { getSuggestions } from './suggestions';
import {
  DEFAULT_PALETTE_NAME,
  GAUGE_FUNCTION,
  GROUP_ID,
  GAUGE_APPEARANCE_FUNCTION,
  LENS_GAUGE_ID,
} from './constants';
import { GaugeToolbar } from './toolbar_component';
import { LensIconChartGaugeHorizontal, LensIconChartGaugeVertical } from '../../assets/chart_gauge';
import { CUSTOM_PALETTE, getStopsForFixedMode } from '../../shared_components';
import { GaugeDimensionEditor } from './dimension_editor';
import { getSafePaletteParams } from './utils';
import type { CustomPaletteParams } from '../../../common';
import { layerTypes } from '../../../common';
import { GoalSubtype } from '@elastic/charts/dist/chart_types/goal_chart/specs/constants';
import { generateId } from '../../id_generator';

const groupLabelForGauge = i18n.translate('xpack.lens.metric.groupLabel', {
  defaultMessage: 'Goal and single value',
});

interface GaugeVisualizationDeps {
  paletteService: PaletteRegistry;
}

export const isNumericMetric = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

function computePaletteParams(params: CustomPaletteParams) {
  return {
    ...params,
    // rewrite colors and stops as two distinct arguments
    colors: (params?.stops || []).map(({ color }) => color),
    stops: params?.name === 'custom' ? (params?.stops || []).map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

export const CHART_NAMES = {
  horizontalBullet: {
    icon: LensIconChartGaugeHorizontal,
    label: i18n.translate('xpack.lens.gaugeHorizontal.gaugeLabel', {
      defaultMessage: 'Gauge Horizontal',
    }),
    groupLabel: groupLabelForGauge,
  },
  verticalBullet: {
    icon: LensIconChartGaugeVertical,
    label: i18n.translate('xpack.lens.gaugeVertical.gaugeLabel', {
      defaultMessage: 'Gauge Vertical',
    }),
    groupLabel: groupLabelForGauge,
  },
};

export const getGaugeVisualization = ({
  paletteService,
}: GaugeVisualizationDeps): Visualization<GaugeVisualizationState> => ({
  id: LENS_GAUGE_ID,

  visualizationTypes: [
    {
      ...CHART_NAMES.horizontalBullet,
      id: GoalSubtype.HorizontalBullet,
      showExperimentalBadge: true,
    },
    {
      ...CHART_NAMES.verticalBullet,
      id: GoalSubtype.VerticalBullet,
      showExperimentalBadge: true,
    },
  ],
  getVisualizationTypeId(state) {
    return state.shape;
  },
  getLayerIds(state) {
    return [state.layerId];
  },
  clearLayer(state) {
    const newState = { ...state };
    delete newState.metricAccessor;
    delete newState.minAccessor;
    delete newState.maxAccessor;
    delete newState.goalAccessor;
    return newState;
  },

  getDescription(state) {
    if (state.shape === GoalSubtype.HorizontalBullet) {
      return CHART_NAMES.horizontalBullet;
    }
    return CHART_NAMES.verticalBullet;
  },

  switchVisualizationType: (visualizationTypeId, state) => {
    return {
      ...state,
      shape: visualizationTypeId as GaugeVisualizationState['shape'],
    };
  },

  initialize(addNewLayer, state, mainPalette) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
        title: 'Empty Gauge chart',
        shape: GoalSubtype.HorizontalBullet,
        // palette: mainPalette,

        appearance: {
          ticksPosition: 'auto',
          titleMode: 'auto',
          type: 'lens_gauge_appearance',
        },
      }
    );
  },

  // getMainPalette: (state) => (state ? state.palette : undefined),
  getSuggestions,

  getConfiguration({ state, frame, layerId }) {
    const datasourceLayer = frame.datasourceLayers[layerId];

    const originalOrder = datasourceLayer.getTableSpec().map(({ columnId }) => columnId);
    if (!originalOrder) {
      return { groups: [], supportStaticValue: true };
    }
    // todo
    const { displayStops, activePalette } = getSafePaletteParams(
      paletteService,
      frame.activeData?.[state.layerId],
      state.metricAccessor,
      state?.palette && state.palette.accessor === state.metricAccessor ? state.palette : undefined
    );

    return {
      groups: [
        {
          supportStaticValue: true,
          supportFieldFormat: true,
          layerId: state.layerId,
          groupId: GROUP_ID.METRIC,
          groupLabel: i18n.translate('xpack.lens.gauge.metricLabel', {
            defaultMessage: 'Metric',
          }),
          accessors: state.metricAccessor
            ? [
                // When data is not available and the range type is numeric, return a placeholder while refreshing
                displayStops.length &&
                (frame.activeData || activePalette?.params?.rangeType !== 'number')
                  ? {
                      columnId: state.metricAccessor,
                      triggerIcon: 'colorBy',
                      palette: getStopsForFixedMode(
                        displayStops,
                        activePalette?.params?.colorStops
                      ),
                    }
                  : {
                      columnId: state.metricAccessor,
                      triggerIcon: 'none',
                    },
              ]
            : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.metricAccessor,
          required: true,
          dataTestSubj: 'lnsGauge_minDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          supportStaticValue: true,
          supportFieldFormat: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MIN,
          groupLabel: i18n.translate('xpack.lens.gauge.minValueLabel', {
            defaultMessage: 'Minimum Value',
          }),
          accessors: state.minAccessor ? [{ columnId: state.minAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.minAccessor,
          required: true,
          dataTestSubj: 'lnsGauge_minDimensionPanel',
        },
        {
          supportStaticValue: true,
          supportFieldFormat: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MAX,
          groupLabel: i18n.translate('xpack.lens.gauge.maxValueLabel', {
            defaultMessage: 'Maximum Value',
          }),
          accessors: state.maxAccessor ? [{ columnId: state.maxAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.maxAccessor,
          required: true,
          dataTestSubj: 'lnsGauge_maxDimensionPanel',
        },
        {
          supportStaticValue: true,
          supportFieldFormat: false,
          layerId: state.layerId,
          groupId: GROUP_ID.GOAL,
          groupLabel: i18n.translate('xpack.lens.gauge.goalValueLabel', {
            defaultMessage: 'Goal value',
          }),
          accessors: state.goalAccessor ? [{ columnId: state.goalAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.goalAccessor,
          required: false,
          dataTestSubj: 'lnsGauge_goalDimensionPanel',
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
    const update: Partial<GaugeVisualizationState> = {};
    if (groupId === GROUP_ID.MIN) {
      update.minAccessor = columnId;
    }
    if (groupId === GROUP_ID.MAX) {
      update.maxAccessor = columnId;
    }
    if (groupId === GROUP_ID.GOAL) {
      update.goalAccessor = columnId;
    }
    if (groupId === GROUP_ID.METRIC) {
      update.metricAccessor = columnId;
    }
    return {
      ...prevState,
      ...update,
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const update = { ...prevState };

    if (prevState.goalAccessor === columnId) {
      delete update.goalAccessor;
    }
    if (prevState.minAccessor === columnId) {
      delete update.minAccessor;
    }
    if (prevState.maxAccessor === columnId) {
      delete update.maxAccessor;
    }
    if (prevState.metricAccessor === columnId) {
      delete update.metricAccessor;
    }

    return update;
  },

  renderDimensionEditor(domElement, props) {
    render(
      <I18nProvider>
        <GaugeDimensionEditor {...props} paletteService={paletteService} />
      </I18nProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <I18nProvider>
        <GaugeToolbar {...props} />
      </I18nProvider>,
      domElement
    );
  },

  getSupportedLayers(state, frame) {
    console.log(state);
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.gauge.addLayer', {
          defaultMessage: 'Add visualization layer',
        }),
        initialDimensions: state
          ? [
              {
                groupId: 'min',
                columnId: generateId(),
                dataType: 'number',
                label: 'minAccessor',
                staticValue: 1,
              },
              {
                groupId: 'max',
                columnId: generateId(),
                dataType: 'number',
                label: 'maxAccessor',
                staticValue: 100,
              },
            ]
          : undefined,
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
  },

  toExpression(state, datasourceLayers, attributes): Ast | null {
    const datasource = datasourceLayers[state.layerId];

    const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order
    // const operations = state.groups
    //   .map((columnId) => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
    //   .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

    if (!originalOrder || !state.metricAccessor || !state.minAccessor || !state.maxAccessor) {
      return null;
    }
    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: GAUGE_FUNCTION,
          arguments: {
            title: [attributes?.title ?? ''],
            description: [attributes?.description ?? ''],
            metricAccessor: [state.metricAccessor ?? ''],
            minAccessor: [state.minAccessor ?? ''],
            maxAccessor: [state.maxAccessor ?? ''],
            goalAccessor: [state.goalAccessor ?? ''],
            shape: [state.shape ?? CHART_NAMES.horizontalBullet],
            palette: state.palette?.params
              ? [
                  paletteService
                    .get(CUSTOM_PALETTE)
                    .toExpression(
                      computePaletteParams((state.palette?.params || {}) as CustomPaletteParams)
                    ),
                ]
              : [paletteService.get(DEFAULT_PALETTE_NAME).toExpression()],
            appearance: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: GAUGE_APPEARANCE_FUNCTION,
                    arguments: {
                      ticksPosition: state.appearance.ticksPosition
                        ? [state.appearance.ticksPosition]
                        : ['auto'],
                      subtitle: state.appearance.subtitle ? [state.appearance.subtitle] : [],
                      title: state.appearance.title ? [state.appearance.title] : [],
                      titleMode: state.appearance.title ? [state.appearance.title] : ['auto'],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  toPreviewExpression(state, datasourceLayers): Ast | null {
    const datasource = datasourceLayers[state.layerId];

    const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order

    if (!originalOrder) {
      return null;
    }

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: GAUGE_FUNCTION,
          arguments: {
            title: [''],
            description: [''],
            shape: [state.shape],
            metricAccessor: [state.metricAccessor ?? ''],
            minAccessor: [state.minAccessor ?? ''],
            maxAccessor: [state.maxAccessor ?? ''],
            goalAccessor: [state.goalAccessor ?? ''],
            palette: state.palette?.params
              ? [
                  paletteService
                    .get(CUSTOM_PALETTE)
                    .toExpression(
                      computePaletteParams((state.palette?.params || {}) as CustomPaletteParams)
                    ),
                ]
              : [paletteService.get(DEFAULT_PALETTE_NAME).toExpression()],
            appearance: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: GAUGE_APPEARANCE_FUNCTION,
                    arguments: {
                      ticksPosition: [state.appearance?.ticksPosition],
                      titleMode: [state.appearance?.titleMode],
                      title: [''],
                      subtitle: [''],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  getErrorMessages(state) {
    if (!state.maxAccessor && !state.minAccessor && !state.goalAccessor && !state.metricAccessor) {
      // nothing configured yet
      return;
    }

    const errors: ReturnType<Visualization['getErrorMessages']> = [];

    if (!state.minAccessor) {
      errors.push({
        shortMessage: i18n.translate(
          'xpack.lens.gaugeVisualization.missingMinAccessorShortMessage',
          {
            defaultMessage: 'Missing Minimum Value.',
          }
        ),
        longMessage: i18n.translate('xpack.lens.gaugeVisualization.missingMinAccessorLongMessage', {
          defaultMessage: 'Configuration for the minimum value is missing.',
        }),
      });
    }

    return errors.length ? errors : undefined;
  },

  getWarningMessages(state, frame) {
    if (!state?.layerId || !frame.activeData || !state.metricAccessor) {
      return;
    }

    const rows = frame.activeData[state.layerId] && frame.activeData[state.layerId].rows;
    if (!rows) {
      return;
    }

    const hasArrayValues = rows.some((row) => Array.isArray(row[state.metricAccessor!]));

    const datasource = frame.datasourceLayers[state.layerId];
    const operation = datasource.getOperationForColumnId(state.metricAccessor);

    return hasArrayValues
      ? [
          <FormattedMessage
            id="xpack.lens.gaugeVisualization.arrayValuesWarningMessage"
            defaultMessage="{label} contains array values. Your visualization may not render as expected."
            values={{ label: <strong>{operation?.label}</strong> }}
          />,
        ]
      : undefined;
  },
});
