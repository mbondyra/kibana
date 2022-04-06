/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './annotations.scss';
import './reference_lines.scss';

import React from 'react';
import { snakeCase } from 'lodash';
import {
  AnnotationDomainType,
  AnnotationTooltipFormatter,
  LineAnnotation,
  Position,
  RectAnnotation,
} from '@elastic/charts';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import {
  ManualPointEventAnnotationArgs,
  ManualRangeEventAnnotationOutput,
} from 'src/plugins/event_annotation/common/manual_event_annotation/types';
import type { FieldFormat } from '../../../../field_formats/common';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';
import type { AnnotationLayerArgs, AnnotationLayerConfigResult } from '../../common/types';
import { AnnotationIcon, hasIcon, Marker, MarkerBody } from '../helpers';
import { mapVerticalToHorizontalPlacement, LINES_MARKER_SIZE } from '../helpers';

const getRoundedTimestamp = (timestamp: number, firstTimestamp?: number, minInterval?: number) => {
  if (!firstTimestamp || !minInterval) {
    return timestamp;
  }
  return timestamp - ((timestamp - firstTimestamp) % minInterval);
};

export interface AnnotationsProps {
  groupedLineAnnotations: CollectiveConfig[];
  rangeAnnotations: ManualRangeEventAnnotationOutput[];
  formatter?: FieldFormat;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
  hide?: boolean;
  minInterval?: number;
  isBarChart?: boolean;
}

interface CollectiveConfig extends ManualPointEventAnnotationArgs {
  roundedTimestamp: number;
  axisMode: 'bottom';
  customTooltipDetails?: AnnotationTooltipFormatter | undefined;
}

const groupVisibleConfigsByInterval = (
  layers: AnnotationLayerArgs[],
  minInterval?: number,
  firstTimestamp?: number
) => {
  return layers
    .flatMap(({ annotations }) =>
      annotations.filter((a) => !a.isHidden && a.type === 'manual_point_event_annotation')
    )
    .sort((a, b) => moment(a.time).valueOf() - moment(b.time).valueOf())
    .reduce<Record<string, ManualPointEventAnnotationArgs[]>>((acc, current) => {
      const roundedTimestamp = getRoundedTimestamp(
        moment(current.time).valueOf(),
        firstTimestamp,
        minInterval
      );
      return {
        ...acc,
        [roundedTimestamp]: acc[roundedTimestamp] ? [...acc[roundedTimestamp], current] : [current],
      };
    }, {});
};

const createCustomTooltipDetails =
  (
    config: ManualPointEventAnnotationArgs[],
    formatter?: FieldFormat
  ): AnnotationTooltipFormatter | undefined =>
  () => {
    return (
      <div key={config[0].time}>
        {config.map(({ icon, label, time, color }) => (
          <div className="echTooltip__item--container" key={snakeCase(label)}>
            <EuiFlexGroup className="echTooltip__label" gutterSize="xs">
              {hasIcon(icon) && (
                <EuiFlexItem grow={false}>
                  <AnnotationIcon type={icon} color={color} />
                </EuiFlexItem>
              )}
              <EuiFlexItem> {label}</EuiFlexItem>
            </EuiFlexGroup>
            <span className="echTooltip__value"> {formatter?.convert(time) || String(time)}</span>
          </div>
        ))}
      </div>
    );
  };

function getCommonProperty<T, K extends keyof ManualPointEventAnnotationArgs>(
  configArr: ManualPointEventAnnotationArgs[],
  propertyName: K,
  fallbackValue: T
) {
  const firstStyle = configArr[0][propertyName];
  if (configArr.every((config) => firstStyle === config[propertyName])) {
    return firstStyle;
  }
  return fallbackValue;
}

const getCommonStyles = (configArr: ManualPointEventAnnotationArgs[]) => {
  return {
    color: getCommonProperty<ManualPointEventAnnotationArgs['color'], 'color'>(
      configArr,
      'color',
      defaultAnnotationColor
    ),
    lineWidth: getCommonProperty(configArr, 'lineWidth', 1),
    lineStyle: getCommonProperty(configArr, 'lineStyle', 'solid'),
    textVisibility: getCommonProperty(configArr, 'textVisibility', false),
  };
};

export const getRangeAnnotations = (layers: AnnotationLayerConfigResult[]) => {
  return layers
    .flatMap(({ annotations }) =>
      annotations.filter(
        (a): a is ManualRangeEventAnnotationOutput =>
          a.type === 'manual_range_event_annotation' && !a.isHidden
      )
    )
    .sort((a, b) => moment(a.time).valueOf() - moment(b.time).valueOf());
};

export const getAnnotationsGroupedByInterval = (
  layers: AnnotationLayerConfigResult[],
  minInterval?: number,
  firstTimestamp?: number,
  formatter?: FieldFormat
) => {
  const visibleGroupedConfigs = groupVisibleConfigsByInterval(layers, minInterval, firstTimestamp);
  let collectiveConfig: CollectiveConfig;
  return Object.entries(visibleGroupedConfigs).map(([roundedTimestamp, configArr]) => {
    collectiveConfig = {
      ...configArr[0],
      roundedTimestamp: Number(roundedTimestamp),
      axisMode: 'bottom',
    };
    if (configArr.length > 1) {
      const commonStyles = getCommonStyles(configArr);
      collectiveConfig = {
        ...collectiveConfig,
        ...commonStyles,
        icon: String(configArr.length),
        customTooltipDetails: createCustomTooltipDetails(configArr, formatter),
      };
    }
    return collectiveConfig;
  });
};

export const Annotations = ({
  groupedLineAnnotations,
  rangeAnnotations,
  formatter,
  isHorizontal,
  paddingMap,
  hide,
  minInterval,
  isBarChart,
}: AnnotationsProps) => {
  return (
    <>
      {groupedLineAnnotations.map((annotation) => {
        const markerPositionVertical = Position.Top;
        const markerPosition = isHorizontal
          ? mapVerticalToHorizontalPlacement(markerPositionVertical)
          : markerPositionVertical;
        const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;
        const id = snakeCase(annotation.label);
        const { roundedTimestamp, time: exactTimestamp } = annotation;
        const isGrouped = Boolean(annotation.customTooltipDetails);
        const header =
          formatter?.convert(isGrouped ? roundedTimestamp : exactTimestamp) ||
          moment(isGrouped ? roundedTimestamp : exactTimestamp).toISOString();
        const strokeWidth = hide ? 1 : annotation.lineWidth || 1;
        return (
          <LineAnnotation
            id={id}
            key={id}
            domainType={AnnotationDomainType.XDomain}
            marker={
              !hide ? (
                <Marker
                  {...{
                    config: annotation,
                    isHorizontal: !isHorizontal,
                    hasReducedPadding,
                    label: annotation.label,
                    rotateClassName: isHorizontal ? 'xyAnnotationIcon_rotate90' : undefined,
                  }}
                />
              ) : undefined
            }
            markerBody={
              !hide ? (
                <MarkerBody
                  label={
                    annotation.textVisibility && !hasReducedPadding ? annotation.label : undefined
                  }
                  isHorizontal={!isHorizontal}
                />
              ) : undefined
            }
            markerPosition={markerPosition}
            dataValues={[
              {
                dataValue: moment(
                  isBarChart && minInterval ? roundedTimestamp + minInterval / 2 : roundedTimestamp
                ).valueOf(),
                header,
                details: annotation.label,
              },
            ]}
            customTooltipDetails={annotation.customTooltipDetails}
            style={{
              line: {
                strokeWidth,
                stroke: annotation.color || defaultAnnotationColor,
                dash:
                  annotation.lineStyle === 'dashed'
                    ? [strokeWidth * 3, strokeWidth]
                    : annotation.lineStyle === 'dotted'
                    ? [strokeWidth, strokeWidth]
                    : undefined,
                opacity: 1,
              },
            }}
          />
        );
      })}
      {rangeAnnotations.map(({ label, time, color, endTime, outside }) => {
        const id = snakeCase(label);
        return (
          <RectAnnotation
            id={id}
            key={id}
            customTooltipDetails={() => (
              <>
                <EuiText size="xs">
                  <h4>
                    {formatter
                      ? `${formatter.convert(time)} — ${formatter?.convert(endTime)}`
                      : `${moment(time).toISOString()} — ${moment(endTime).toISOString()}`}
                  </h4>
                </EuiText>
                <EuiText size="xs">{label}</EuiText>
              </>
            )}
            dataValues={[
              {
                coordinates: {
                  x0: moment(time).valueOf(),
                  x1: moment(endTime).valueOf(),
                },
                details: label,
              },
            ]}
            style={{ fill: color || defaultAnnotationColor }}
            outside={Boolean(outside)}
            outsideDimension={hide ? 2 : 10}
          />
        );
      })}
    </>
  );
};
