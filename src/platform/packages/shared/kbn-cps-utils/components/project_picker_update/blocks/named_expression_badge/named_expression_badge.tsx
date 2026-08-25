/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NamedProjectRouting } from '../../utils/named_project_routing';
import { truncateNamedProjectRoutingValue } from '../../utils/named_project_routing';
import { filterBadgeStyles } from '../filter_badge/filter_badge.styles';

export interface NamedExpressionBadgeProps {
  namedProjectRouting: NamedProjectRouting;
  isRemoveDisabled?: boolean;
  onRemove?: () => void;
}

export function NamedExpressionBadge({
  namedProjectRouting,
  isRemoveDisabled = false,
  onRemove,
}: NamedExpressionBadgeProps) {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => filterBadgeStyles(euiThemeContext), [euiThemeContext]);
  const lockTooltip = i18n.translate('cpsUtils.projectPicker.namedExpressionBadge.lockedTooltip', {
    defaultMessage:
      'Project selection is locked while a named routing expression is applied. Remove the expression to change project scope.',
  });
  const tooltipContent = namedProjectRouting.evaluatedValue
    ? i18n.translate('cpsUtils.projectPicker.namedExpressionBadge.evaluatedLockedTooltip', {
        defaultMessage:
          '{evaluatedValue}. Project selection is locked while a named routing expression is applied. Remove the expression to change project scope.',
        values: {
          evaluatedValue: truncateNamedProjectRoutingValue(namedProjectRouting.evaluatedValue),
        },
      })
    : lockTooltip;

  const canRemove = Boolean(onRemove) && !isRemoveDisabled;

  const badge = canRemove ? (
    <EuiBadge
      css={styles.container}
      color="hollow"
      data-test-subj="projectPickerNamedExpressionBadge"
      iconType="cross"
      iconSide="right"
      iconOnClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onRemove?.();
      }}
      iconOnClickAriaLabel={i18n.translate(
        'cpsUtils.projectPicker.namedExpressionBadge.removeAriaLabel',
        {
          defaultMessage: 'Remove named project routing expression',
        }
      )}
      closeButtonProps={{
        'data-test-subj': 'projectPickerNamedExpressionBadgeRemoveButton',
      }}
    >
      {namedProjectRouting.reference}
    </EuiBadge>
  ) : (
    <EuiBadge
      css={styles.container}
      color="hollow"
      data-test-subj="projectPickerNamedExpressionBadge"
    >
      {namedProjectRouting.reference}
    </EuiBadge>
  );

  return <EuiToolTip content={tooltipContent}>{badge}</EuiToolTip>;
}
