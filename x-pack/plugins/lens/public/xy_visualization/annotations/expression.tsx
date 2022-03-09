/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import type { FieldFormat } from 'src/plugins/field_formats/common';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';
import type { IconPosition, XYAnnotationLayerConfig, YAxisMode } from '../../../common/expressions';
import { hasIcon } from '../xy_config_panel/shared/icon_select';

export const ANNOTATIONS_MARKER_SIZE = 20;

function getBaseIconPlacement(iconPosition: IconPosition) {
  return iconPosition === 'below' ? Position.Bottom : Position.Top;
}

function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
  }
}

function MarkerBody({ label, isHorizontal }: { label: string | undefined; isHorizontal: boolean }) {
  if (!label) {
    return null;
  }
  if (isHorizontal) {
    return (
      <div className="eui-textTruncate" style={{ maxWidth: ANNOTATIONS_MARKER_SIZE * 3 }}>
        {label}
      </div>
    );
  }
  return (
    <div
      className="lnsXyDecorationRotatedWrapper"
      style={{
        width: ANNOTATIONS_MARKER_SIZE,
      }}
    >
      <div
        className="eui-textTruncate lnsXyDecorationRotatedWrapper__label"
        style={{
          maxWidth: ANNOTATIONS_MARKER_SIZE * 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface MarkerConfig {
  axisMode?: YAxisMode;
  icon?: string;
  textVisibility?: boolean;
}

function Marker({
  config,
  label,
  isHorizontal,
  hasReducedPadding,
}: {
  config: MarkerConfig;
  label: string | undefined;
  isHorizontal: boolean;
  hasReducedPadding: boolean;
}) {
  // show an icon if present
  if (hasIcon(config.icon)) {
    return <EuiIcon type={config.icon} />;
  }
  // if there's some text, check whether to show it as marker, or just show some padding for the icon
  if (config.textVisibility) {
    if (hasReducedPadding) {
      return <MarkerBody label={label} isHorizontal={!isHorizontal} />;
    }
    return <EuiIcon type="empty" />;
  }
  return null;
}

export interface AnnotationsProps {
  layers: XYAnnotationLayerConfig[];
  formatter?: FieldFormat;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
}

export const Annotations = ({ layers, formatter, isHorizontal, paddingMap }: AnnotationsProps) => {
  return (
    <>
      {layers.flatMap(({ config: configs, layerId }) => {
        if (!configs) {
          return [];
        }
        return configs.map((config) => {
          const markerPositionVertical = getBaseIconPlacement(config.iconPosition);
          const hasReducedPadding = paddingMap[markerPositionVertical] === ANNOTATIONS_MARKER_SIZE;
          const label = config.label;
          const timestamp = Number(config.key.timestamp);

          return !config?.isHidden ? (
            <LineAnnotation
              id={`${layerId}-${config.id}-line`}
              key={`${layerId}-${config.id}-line`}
              domainType={AnnotationDomainType.XDomain}
              marker={<Marker {...{ config, label, isHorizontal, hasReducedPadding }} />}
              markerBody={
                <MarkerBody
                  label={config.textVisibility && !hasReducedPadding ? label : undefined}
                  isHorizontal={!isHorizontal}
                />
              }
              markerPosition={
                isHorizontal
                  ? mapVerticalToHorizontalPlacement(markerPositionVertical)
                  : markerPositionVertical
              }
              dataValues={[
                {
                  dataValue: timestamp,
                  header: label,
                  details: formatter?.convert(timestamp) || String(timestamp), // pass date formatter
                },
              ]}
              style={{
                line: {
                  strokeWidth: config.lineWidth || 1,
                  stroke: config.color || defaultAnnotationColor,
                  dash:
                    config.lineStyle === 'dashed'
                      ? [(config.lineWidth || 1) * 3, config.lineWidth || 1]
                      : config.lineStyle === 'dotted'
                      ? [config.lineWidth || 1, config.lineWidth || 1]
                      : undefined,
                  opacity: 1,
                },
              }}
            />
          ) : null;
        });
      })}
    </>
  );
};
