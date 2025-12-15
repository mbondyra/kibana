/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { VisualizationSavedObjectAttributes } from '../../../common/content_management/v1/types';

export interface ProjectRoutingManager {
  projectRouting$: BehaviorSubject<ProjectRouting>;
  getProjectRouting: () => ProjectRouting;
  setProjectRouting: (projectRouting: ProjectRouting) => void;
  getStateForSave: (projectRoutingRestore: boolean) => Pick<VisualizationSavedObjectAttributes, 'project_routing'>;
  cleanup: () => void;
}

export function initializeProjectRoutingManager(
  initialProjectRouting: ProjectRouting | undefined,
  cpsManager: CPSPluginStart['cpsManager']
): ProjectRoutingManager | undefined {
  if (!cpsManager) {
    return undefined;
  }

  const projectRouting$ = new BehaviorSubject<ProjectRouting>(initialProjectRouting);

  function setProjectRouting(projectRouting: ProjectRouting) {
    if (projectRouting !== projectRouting$.value) {
      projectRouting$.next(projectRouting);
    }
  }

  // Initialize CPS manager with saved project routing or default
  cpsManager.setProjectRouting(
    initialProjectRouting ?? cpsManager.getDefaultProjectRouting()
  );

  // Subscribe to CPS's projectRouting$ to sync changes from the project picker
  const cpsProjectRoutingSubscription: Subscription | undefined = cpsManager
    ?.getProjectRouting$()
    ?.subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
      setProjectRouting(cpsProjectRouting);
    });

  const getProjectRouting = (): ProjectRouting => {
    return cpsManager?.getProjectRouting() ?? projectRouting$.value;
  };

  const getStateForSave = (
    projectRoutingRestore: boolean
  ): Pick<VisualizationSavedObjectAttributes, 'project_routing'> => {
    if (!projectRoutingRestore) {
      // Explicitly set to null to clear the saved value when toggle is off
      return { project_routing: null };
    }

    // Read from CPS if available, otherwise use internal state
    return {
      project_routing: cpsManager?.getProjectRouting() ?? projectRouting$.value,
    };
  };

  return {
    projectRouting$,
    getProjectRouting,
    setProjectRouting,
    getStateForSave,
    cleanup: () => {
      cpsProjectRoutingSubscription?.unsubscribe();
    },
  };
}

