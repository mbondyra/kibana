/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiSelectable, EuiInputPopover, EuiSelectableProps } from '@elastic/eui';
import { DataViewListItem } from '@kbn/data-views-plugin/common';

import { ToolbarButton, ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';

export type DataViewTriggerProps = Omit<ToolbarButtonProps<'standard'>, 'label'> & {
  label: string;
  title?: string;
};

export function DataViewPicker({
  dataViews,
  selectedDataViewId,
  onChangeDataViewId,
  trigger,
  selectableProps,
  ...other
}: {
  dataViews: DataViewListItem[];
  selectedDataViewId?: string;
  trigger: DataViewTriggerProps;
  onChangeDataViewId: (newId: string) => void;
  selectableProps?: Partial<EuiSelectableProps>;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const isMissingCurrent = !dataViews.some(({ id }) => id === selectedDataViewId);

  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <ToolbarButton
        aria-label={title}
        data-test-subj="open-data-view-picker"
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        label={label}
        fullWidth
        {...colorProp}
        {...rest}
      />
    );
  };
  const maxLabelLength = dataViews.reduce((acc, curr) => {
    const dataViewName = curr.name || curr.id;
    return acc > dataViewName.length ? acc : dataViewName.length;
  }, 0);
  const panelMinWidth = getPanelMinWidth(maxLabelLength);

  return (
    <EuiInputPopover
      {...other}
      ownFocus
      fullWidth
      display="block"
      panelPaddingSize="s"
      isOpen={isPopoverOpen}
      input={createTrigger()}
      closePopover={() => setPopoverIsOpen(false)}
      panelMinWidth={panelMinWidth}
      panelProps={{
        'data-test-subj': 'data-view-picker-popover',
      }}
    >
      <EuiSelectable<{
        key?: string;
        label: string;
        value?: string;
        checked?: 'on' | 'off' | undefined;
      }>
        {...selectableProps}
        searchable
        singleSelection="always"
        options={dataViews.map(({ name, id, title }) => ({
          key: id,
          label: name ?? title,
          value: id,
          'data-test-subj': `data-view-picker-${name ?? title}`,
          checked: id === selectedDataViewId ? 'on' : undefined,
        }))}
        onChange={(choices) => {
          const choice = choices.find(({ checked }) => checked) as unknown as {
            value: string;
          };
          onChangeDataViewId(choice.value);
          setPopoverIsOpen(false);
        }}
        searchProps={{
          compressed: true,
          ...(selectableProps ? selectableProps.searchProps : undefined),
        }}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiInputPopover>
  );
}

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default DataViewPicker;

const MINIMUM_POPOVER_WIDTH = 300;
const MINIMUM_POPOVER_WIDTH_CHAR_COUNT = 28;
const AVERAGE_CHAR_WIDTH = 7;
const MAXIMUM_POPOVER_WIDTH_CHAR_COUNT = 60;
const MAXIMUM_POPOVER_WIDTH = 550; // fitting 60 characters

function getPanelMinWidth(labelLength: number) {
  if (labelLength > MAXIMUM_POPOVER_WIDTH_CHAR_COUNT) {
    return MAXIMUM_POPOVER_WIDTH;
  }
  if (labelLength > MINIMUM_POPOVER_WIDTH_CHAR_COUNT) {
    const overflownChars = labelLength - MINIMUM_POPOVER_WIDTH_CHAR_COUNT;
    return MINIMUM_POPOVER_WIDTH + overflownChars * AVERAGE_CHAR_WIDTH;
  }
  return MINIMUM_POPOVER_WIDTH;
}
