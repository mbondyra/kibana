/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionAstExpression } from '../../../expressions/common/ast';
import { IconPosition, LineStyle } from '../../common/types';

/**
 * Definition of a global annotation.
 *
 * A annotation controls the appearance of Lens charts on an editor level.
 * The annotation wont get reset when switching charts.
 *
 * A annotation can hold internal state (e.g. for customizations) and also includes
 * an editor component to edit the internal state.
 */

interface ToExpressionProps {
  label: string;
  color: string;
  lineWidth: number;
  lineStyle: LineStyle;
  id: string;
  icon: string;
  iconPosition: IconPosition;
  textVisibility: boolean;
  isHidden?: boolean;
  timestamp: string;
  annotationType: 'manual';
  keyType: 'point_in_time';
}
export interface EventAnnotationService {
  /**
   * User facing title (should be i18n-ized)
   */
  title: string;
  toExpression: (props: ToExpressionProps) => ExpressionAstExpression;
}
