/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { NamedExpressionBadge } from './named_expression_badge';

describe('NamedExpressionBadge', () => {
  it('shows the evaluated value in the tooltip', async () => {
    render(
      <EuiThemeProvider>
        <NamedExpressionBadge
          namedProjectRouting={{
            reference: '@origin_only',
            evaluatedValue: '_alias:_origin',
          }}
        />
      </EuiThemeProvider>
    );

    const badge = screen.getByTestId('projectPickerNamedExpressionBadge');
    expect(badge).toHaveTextContent('@origin_only');

    const tooltipAnchor = badge.closest('.euiToolTipAnchor') ?? badge;
    await userEvent.hover(tooltipAnchor);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('_alias:_origin');
    expect(tooltip).toHaveTextContent('Project selection is locked');
  });
});
