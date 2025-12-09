/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { diffComparators } from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, combineLatestWith, debounceTime, map, Subject } from 'rxjs';
import { cpsService } from '../services/kibana_services';
import type { DashboardState } from '../../common';

export const COMPARE_DEBOUNCE = 100;

export function initializeProjectRoutingManager(
  initialState: DashboardState,
  projectRoutingRestore$: PublishingSubject<boolean>,
  reload$: Subject<void>
) {
  if (!cpsService?.cpsManager) {
    return;
  }

  const cpsManager = cpsService.cpsManager;

  // pass the initial state to CPS manager from dashboard state or just reset to default on dashboard init
  cpsManager.setProjectRouting(
    initialState.project_routing ?? cpsManager.getDefaultProjectRouting()
  );

  function setProjectRouting(projectRouting: ProjectRouting) {
    if (projectRouting !== cpsManager.getProjectRouting()) {
      cpsManager.setProjectRouting(projectRouting);
    }
  }

  // Subscribe to CPS projectRouting changes
  // When projectRouting changes, trigger reload like filters/time changes
  // Data plugin will automatically inject the new value from CPS Manager
  const cpsProjectRoutingSubscription: Subscription | undefined = cpsManager
    .getProjectRouting$()
    .subscribe(() => {
      reload$.next();
    });

  const comparators = {
    project_routing: (_a, _b, lastSavedState, _latestState) => {
      if (!projectRoutingRestore$.value) return true;
      const savedValue = lastSavedState?.project_routing;
      return savedValue === cpsManager.getProjectRouting();
    },
  } as StateComparators<Pick<DashboardState, 'project_routing'>>;

  const getState = (): Pick<DashboardState, 'project_routing'> => {
    if (!projectRoutingRestore$.value) {
      // Don't save anything when projectRestore is false
      return {};
    }

    return {
      project_routing: cpsManager.getProjectRouting(),
    };
  };

  return {
    api: {
      projectRouting$: cpsManager.getProjectRouting$(),
      setProjectRouting,
    },
    internalApi: {
      startComparing$: (lastSavedState$: BehaviorSubject<DashboardState>) => {
        return cpsManager.getProjectRouting$().pipe(
          debounceTime(COMPARE_DEBOUNCE),
          map(() => getState()),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) => {
            return diffComparators(comparators, lastSavedState, latestState);
          })
        );
      },
      comparators,
      getState,
      reset: (lastSavedState: DashboardState) => {
        setProjectRouting(lastSavedState.project_routing ?? cpsManager.getDefaultProjectRouting());
      },
    },
    cleanup: () => {
      cpsProjectRoutingSubscription?.unsubscribe();
    },
  };
}
