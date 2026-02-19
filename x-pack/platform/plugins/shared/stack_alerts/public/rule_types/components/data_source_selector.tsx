/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch, type EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ProjectRouting } from '@kbn/es-query';
import { ProjectPicker } from '@kbn/cps-utils';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DataViewSelectPopoverProps } from './data_view_select_popover';
import { DataViewSelectPopover } from './data_view_select_popover';

export interface DataSourceSelectorProps extends DataViewSelectPopoverProps {
  cps?: CPSPluginStart;
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting | undefined) => void;
  hasPersistedProjectRouting: boolean;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  cps,
  projectRouting,
  onProjectRoutingChange,
  hasPersistedProjectRouting,
  dependencies,
  dataView,
  metadata,
  onSelectDataView,
  onChangeMetaData,
}) => {
  const cpsManager = cps?.cpsManager;
  // Override is enabled if there's a persisted project_routing value
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(hasPersistedProjectRouting);
  // Local display value for when override is disabled (follows global scope)
  const [displayProjectRouting, setDisplayProjectRouting] = useState<ProjectRouting | undefined>(
    projectRouting
  );

  // Subscribe to global project routing changes when override is disabled
  useEffect(() => {
    if (!cpsManager || isOverrideEnabled) {
      return;
    }

    const subscription = cpsManager.getProjectRouting$().subscribe((globalProjectRouting) => {
      // Only update local display, don't persist
      setDisplayProjectRouting(globalProjectRouting);
    });

    return () => subscription.unsubscribe();
  }, [cpsManager, isOverrideEnabled]);

  // Sync display value with prop when override is enabled
  useEffect(() => {
    if (isOverrideEnabled) {
      setDisplayProjectRouting(projectRouting);
    }
  }, [isOverrideEnabled, projectRouting]);

  const handleOverrideChange = useCallback(
    (e: EuiSwitchEvent) => {
      const newOverrideValue = e.target.checked;
      setIsOverrideEnabled(newOverrideValue);

      if (newOverrideValue) {
        // When enabling override, set the current display value as the persisted value
        const valueToSave = displayProjectRouting ?? cpsManager?.getProjectRouting();
        if (valueToSave) {
          onProjectRoutingChange(valueToSave);
        }
      } else {
        // When disabling override, clear the persisted value (set to undefined)
        onProjectRoutingChange(undefined);
      }
    },
    [cpsManager, displayProjectRouting, onProjectRoutingChange]
  );

  const settingsComponent = (
    <EuiSwitch
      label={i18n.translate('xpack.stackAlerts.components.dataSourceSelector.overrideGlobalScope', {
        defaultMessage: 'Override global scope',
      })}
      checked={isOverrideEnabled}
      onChange={handleOverrideChange}
      compressed
      data-test-subj="override-global-scope-switch"
    />
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {cpsManager && (
        <EuiFlexItem grow={false}>
          <ProjectPicker
            projectRouting={displayProjectRouting}
            onProjectRoutingChange={onProjectRoutingChange}
            fetchProjects={() => cpsManager.fetchProjects()}
            isReadonly={!isOverrideEnabled}
            shouldDisplayReadonlyCallout={false}
            settingsComponent={settingsComponent}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <DataViewSelectPopover
          dependencies={dependencies}
          dataView={dataView}
          metadata={metadata}
          onSelectDataView={onSelectDataView}
          onChangeMetaData={onChangeMetaData}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
