/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiFieldText, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '.';

type TitleMode = 'auto' | 'hidden' | 'custom';

interface Title {
  mode: TitleMode;
  name: string;
}

export interface VisTitleProps {
  autoPlaceholder: string;
  title: Title;
  updateTitle: (title: Title) => void;
}

export function VisTitle({ title, autoPlaceholder, updateTitle }: VisTitleProps) {
  const { inputValue: currentTitle, handleInputChange: onTitleChange } = useDebouncedValue<Title>({
    value: title,
    onChange: updateTitle,
  });
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <h4>
            {i18n.translate('xpack.lens.xyChart.axisNameLabel', {
              defaultMessage: 'Axis name',
            })}
          </h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          data-test-subj={`lnsShowVisTitleSelect`}
          aria-label="Axis name"
          onChange={({ target }) => {
            onTitleChange({ ...currentTitle, mode: target.value as TitleMode });
          }}
          options={[
            {
              value: 'hide',
              text: i18n.translate('xpack.lens.xyChart.hideAxisTitleLabel', {
                defaultMessage: 'Hide',
              }),
            },
            {
              value: 'auto',
              text: i18n.translate('xpack.lens.xyChart.autoAxisTitleLabel', {
                defaultMessage: 'Auto',
              }),
            },
            {
              value: 'custom',
              text: i18n.translate('xpack.lens.xyChart.customAxisTitleLabel', {
                defaultMessage: 'Custom',
              }),
            },
          ]}
          value={currentTitle.mode}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFieldText
          data-test-subj={`lnsVisTitle`}
          compressed
          placeholder={currentTitle.mode !== 'hidden' ? autoPlaceholder : ''}
          value={title.name || ''}
          disabled={currentTitle.mode !== 'custom'}
          onChange={({ target }) => onTitleChange({ ...currentTitle, name: target.value })}
          aria-label={i18n.translate('xpack.lens.xyChart.overwriteAxisTitle', {
            defaultMessage: 'Overwrite axis title',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
