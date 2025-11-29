/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Action,
  ActionExecutionMeta,
  FrequentCompatibilityChangeAction,
} from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React, { useState } from 'react';
import { EuiPopover, EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiPublishesProjectRouting, apiHasParentApi } from '@kbn/presentation-publishing';
import { apiPublishesLayerProjectRoutingOverrides } from '@kbn/lens-common-2';
import type { LensSerializedState } from '@kbn/lens-common';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { combineLatest, map } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { CPS_USAGE_OVERRIDES_BADGE } from './constants';
import { uiActions } from '../../kibana_services';
import { ACTION_EDIT_PANEL } from '../edit_panel_action/constants';
import { CONTEXT_MENU_TRIGGER } from '../triggers';

export class CpsUsageOverridesBadge
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = CPS_USAGE_OVERRIDES_BADGE;
  public readonly id = CPS_USAGE_OVERRIDES_BADGE;
  public order = 8;

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!this.hasOverride(embeddable)) throw new IncompatibleActionError();

    // Check for layer-level overrides
    if (apiPublishesLayerProjectRoutingOverrides(embeddable)) {
      if (embeddable.hasLayerProjectRoutingOverrides$.value) {
        return i18n.translate('presentationPanel.badge.cpsUsageOverrides.displayName.layers', {
          defaultMessage: 'This panel has layer-level CPS scope overrides',
        });
      }
    }

    // Check for panel-level overrides
    if (!apiPublishesProjectRouting(embeddable)) {
      throw new IncompatibleActionError();
    }

    const overrideValue = embeddable.projectRouting$.value;

    return i18n.translate('presentationPanel.badge.cpsUsageOverrides.displayName', {
      defaultMessage: 'This panel overrides the dashboard CPS scope with: {value}',
      values: {
        value: overrideValue,
      },
    });
  }

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    if (!this.hasOverride(embeddable)) throw new IncompatibleActionError();

    // Check if this is a layer-level override
    const hasLayerOverrides =
      apiPublishesLayerProjectRoutingOverrides(embeddable) &&
      embeddable.hasLayerProjectRoutingOverrides$.value;

    // Get panel-level values if available
    const hasPanelOverride =
      apiPublishesProjectRouting(embeddable) &&
      apiHasParentApi(embeddable) &&
      apiPublishesProjectRouting(embeddable.parentApi);

    const overrideValue = hasPanelOverride ? embeddable.projectRouting$.value : undefined;
    const dashboardValue = hasPanelOverride
      ? embeddable.parentApi.projectRouting$.value
      : undefined;

    const badgeLabel = i18n.translate('presentationPanel.badge.cpsUsageOverrides.label', {
      defaultMessage: 'CPS overrides',
    });

    const formatProjectRoutingValue = (value: string | undefined) => {
      if (value === 'ALL') {
        return i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.allProjects', {
          defaultMessage: 'All projects',
        });
      }
      return value;
    };

    const handleEditClick = async () => {
      setIsPopoverOpen(false);
      const action = await uiActions.getAction(ACTION_EDIT_PANEL);
      if (action) {
        await action.execute({
          ...context,
          trigger: { id: CONTEXT_MENU_TRIGGER },
        });
      }
    };

    const handleToggle = () => setIsPopoverOpen(!isPopoverOpen);

    return (
      <EuiPopover
        button={
          <span
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            data-test-subj="cpsUsageOverridesBadgeButton"
          >
            {badgeLabel}
          </span>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downCenter"
      >
        <EuiText size="s" style={{ maxWidth: '300px' }}>
          <p>
            <strong>
              {i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.title', {
                defaultMessage: 'CPS Scope Override',
              })}
            </strong>
          </p>
          {hasLayerOverrides && (
            <p>
              {i18n.translate(
                'presentationPanel.badge.cpsUsageOverrides.popover.layerDescription',
                {
                  defaultMessage:
                    'This panel has one or more layers with CPS scope overrides. Edit the panel to modify layer-specific settings.',
                }
              )}
            </p>
          )}
          {hasPanelOverride && (
            <>
              <p>
                <strong>
                  {i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.panelScope', {
                    defaultMessage: 'Panel scope:',
                  })}
                </strong>
                {formatProjectRoutingValue(overrideValue)}
                <br />
                <strong>
                  {i18n.translate(
                    'presentationPanel.badge.cpsUsageOverrides.popover.dashboardScope',
                    {
                      defaultMessage: 'Dashboard scope:',
                    }
                  )}
                </strong>{' '}
                {formatProjectRoutingValue(dashboardValue) ??
                  i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.notSet', {
                    defaultMessage: 'Not set',
                  })}
              </p>
              <p>
                {i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.description', {
                  defaultMessage:
                    "To use the dashboard's CPS scope, remove the override from panel settings.",
                })}
              </p>
            </>
          )}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButton
          onClick={handleEditClick}
          size="s"
          fullWidth
          iconType="pencil"
          data-test-subj="cpsUsageOverridesEditButton"
        >
          {i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.editButton', {
            defaultMessage: 'Edit panel configuration',
          })}
        </EuiButton>
      </EuiPopover>
    );
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    // Could become compatible if embeddable supports layer-level overrides
    if (apiPublishesLayerProjectRoutingOverrides(embeddable)) {
      return true;
    }

    // Or if it supports panel-level project routing
    return (
      apiPublishesProjectRouting(embeddable) &&
      apiHasParentApi(embeddable) &&
      apiPublishesProjectRouting(embeddable.parentApi)
    );
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    const observables = [];

    // Subscribe to layer-level overrides changes
    if (apiPublishesLayerProjectRoutingOverrides(embeddable)) {
      observables.push(embeddable.hasLayerProjectRoutingOverrides$);
    }

    // Subscribe to panel-level project routing changes
    if (
      apiPublishesProjectRouting(embeddable) &&
      apiHasParentApi(embeddable) &&
      apiPublishesProjectRouting(embeddable.parentApi)
    ) {
      observables.push(embeddable.projectRouting$, embeddable.parentApi.projectRouting$);
    }

    if (observables.length > 0) {
      return combineLatest(observables).pipe(map(() => undefined));
    }

    return undefined;
  }

  public async execute(_context: ActionExecutionMeta & EmbeddableApiContext) {
    // Badge is informational only - clicking shows tooltip but doesn't navigate
    return;
  }

  public getIconType() {
    return 'beaker';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return this.hasOverride(embeddable);
  }

  private hasOverride(embeddable: unknown): boolean {
    // Get the comparison value (panel or dashboard override) for layer comparison
    let comparisonValue: string | undefined;
    if (
      apiPublishesProjectRouting(embeddable) &&
      apiHasParentApi(embeddable) &&
      apiPublishesProjectRouting(embeddable.parentApi)
    ) {
      // Use panel override if it exists, otherwise use dashboard override
      comparisonValue = embeddable.projectRouting$.value ?? embeddable.parentApi.projectRouting$.value;
    } else if (apiPublishesProjectRouting(embeddable)) {
      comparisonValue = embeddable.projectRouting$.value;
    }

    // Check for layer-level overrides (e.g., Lens layers)
    if (apiPublishesLayerProjectRoutingOverrides(embeddable)) {
      if (embeddable.hasLayerProjectRoutingOverrides$.value) {
        // Check if layer overrides are actually different from the comparison value
        const hasDifferentLayerOverrides = this.hasDifferentLayerOverrides(embeddable, comparisonValue);
        if (hasDifferentLayerOverrides) {
          return true;
        }
      }
    }

    // Check for panel-level overrides
    if (
      !apiPublishesProjectRouting(embeddable) ||
      !apiHasParentApi(embeddable) ||
      !apiPublishesProjectRouting(embeddable.parentApi)
    ) {
      return false;
    }

    const embeddableProjectRouting = embeddable.projectRouting$.value;
    const parentProjectRouting = embeddable.parentApi.projectRouting$.value;

    // Only show badge if embeddable has an explicit (non-undefined) override that differs from dashboard
    return (
      embeddableProjectRouting !== undefined && embeddableProjectRouting !== parentProjectRouting
    );
  }

  /**
   * Normalizes project routing values for comparison.
   * Both undefined and 'ALL' represent the default (all projects), so they should be treated as equal.
   */
  private normalizeProjectRouting(value: string | undefined): string | undefined {
    // Both undefined and 'ALL' represent "all projects" (the default)
    if (value === PROJECT_ROUTING.ALL || value === undefined) {
      return undefined;
    }
    return value;
  }

  /**
   * Checks if any layer has a project routing override that differs from the comparison value
   */
  private hasDifferentLayerOverrides(
    embeddable: { getLegacySerializedState?: () => LensSerializedState },
    comparisonValue: string | undefined
  ): boolean {
    // Check if this is a Lens embeddable with getLegacySerializedState method
    if (!embeddable.getLegacySerializedState) {
      // If we can't access the state, we can't verify if overrides are different
      // Return false to avoid showing the badge when we can't verify
      return false;
    }

    // Normalize the comparison value (undefined and 'ALL' are equivalent)
    const normalizedComparison = this.normalizeProjectRouting(comparisonValue);

    try {
      const serializedState = embeddable.getLegacySerializedState();
      
      // For by-reference panels, attributes might not be available
      if (!serializedState || !('attributes' in serializedState) || !serializedState.attributes) {
        return false;
      }

      const attributes = serializedState.attributes;
      if (!attributes?.state) {
        return false;
      }

      // Check form-based datasource layers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formBasedState = attributes.state.datasourceStates?.formBased as any;
      if (formBasedState?.layers) {
        const layers = Object.values(formBasedState.layers);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasDifferentOverride = layers.some((layer: any) => {
          const layerProjectRouting = layer.projectRouting;
          // Normalize layer value and compare
          const normalizedLayerValue = this.normalizeProjectRouting(layerProjectRouting);
          // Only consider it an override if it's defined and different from comparison value
          return layerProjectRouting !== undefined && normalizedLayerValue !== normalizedComparison;
        });
        if (hasDifferentOverride) {
          return true;
        }
      }

      // Check XY annotation layers
      if (attributes.visualizationType === 'lnsXY' && attributes.state.visualization) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xyState = attributes.state.visualization as any;
        if (xyState?.layers) {
          const annotationLayers = xyState.layers.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (layer: any) => layer.layerType === 'annotations'
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hasDifferentOverride = annotationLayers.some((layer: any) => {
            const layerProjectRouting = layer.projectRouting;
            // Normalize layer value and compare
            const normalizedLayerValue = this.normalizeProjectRouting(layerProjectRouting);
            // Only consider it an override if it's defined and different from comparison value
            return layerProjectRouting !== undefined && normalizedLayerValue !== normalizedComparison;
          });
          if (hasDifferentOverride) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      // If we can't access the state, we can't verify if overrides are different
      // Return false to avoid showing the badge when we can't verify
      return false;
    }
  }
}
