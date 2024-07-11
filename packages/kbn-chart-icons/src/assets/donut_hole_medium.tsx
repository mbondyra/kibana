/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const IconDonutHoleMedium = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={titleId}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}

      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 4C5.567 4 4 5.567 4 7.5C4 9.433 5.567 11 7.5 11C9.433 11 11 9.433 11 7.5C11 5.567 9.433 4 7.5 4ZM5 7.5C5 6.11929 6.11929 5 7.5 5C8.88071 5 10 6.11929 10 7.5C10 8.88071 8.88071 10 7.5 10C6.11929 10 5 8.88071 5 7.5Z"
        fill="#343741"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 0C3.35786 0 0 3.35786 0 7.5C0 11.6421 3.35786 15 7.5 15C11.6421 15 15 11.6421 15 7.5C15 3.35786 11.6421 0 7.5 0ZM1 7.5C1 3.91015 3.91015 1 7.5 1C11.0899 1 14 3.91015 14 7.5C14 11.0899 11.0899 14 7.5 14C3.91015 14 1 11.0899 1 7.5Z"
        fill="#343741"
      />
    </svg>
  );
};
