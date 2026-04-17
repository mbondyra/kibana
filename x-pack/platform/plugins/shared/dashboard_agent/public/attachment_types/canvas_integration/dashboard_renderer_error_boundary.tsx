/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiCallOut, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';

interface DashboardRendererErrorBoundaryProps {
  resetKey: unknown;
  children?: React.ReactNode;
}

export const DashboardRendererErrorBoundary = ({
  resetKey,
  children,
}: DashboardRendererErrorBoundaryProps) => {
  const previousResetKey = useRef(resetKey);
  const [boundaryKey, setBoundaryKey] = useState(0);

  useEffect(() => {
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      setBoundaryKey((value) => value + 1);
    }
  }, [resetKey]);

  return <KibanaErrorBoundary key={boundaryKey}>{children}</KibanaErrorBoundary>;
};

export const DashboardPreviewErrorCallout = ({}: {}) => (
  <div
    css={ ({ euiTheme }: UseEuiTheme) => css({
      width: '100%',
      marginLeft: euiTheme.size.s,
      marginRight: euiTheme.size.s,
    })}
  >
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType="error"
      title="This dashboard preview could not be rendered."
      data-test-subj="dashboardRendererError"
    >
      Ask the agent to repair the invalid or incomplete dashboard state.
    </EuiCallOut>
  </div>
);
