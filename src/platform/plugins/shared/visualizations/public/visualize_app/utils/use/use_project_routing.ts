/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import type { VisualizeServices } from '../../types';
import type { VisSavedObject } from '../../../types';
import {
  initializeProjectRoutingManager,
  type ProjectRoutingManager,
} from '../project_routing_manager';

export function useProjectRouting(
  services: VisualizeServices,
  savedVis: VisSavedObject | undefined,
  visType: string | undefined
) {
  const [projectRoutingManager, setProjectRoutingManager] = useState<ProjectRoutingManager | undefined>();
  const cleanupRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    // Only initialize for Vega visualizations
    if (visType !== 'vega' || !services.cps?.cpsManager) {
      return;
    }

    // Get initial project routing from saved visualization
    const initialProjectRouting = (savedVis as any)?.project_routing;

    const manager = initializeProjectRoutingManager(
      initialProjectRouting,
      services.cps.cpsManager
    );

    if (manager) {
      setProjectRoutingManager(manager);
      cleanupRef.current = manager.cleanup;
    }

    return () => {
      cleanupRef.current?.();
    };
  }, [services.cps?.cpsManager, savedVis?.id, visType]);

  // Update project routing when saved visualization changes
  useEffect(() => {
    if (!projectRoutingManager || !savedVis) {
      return;
    }

    const savedProjectRouting = (savedVis as any)?.project_routing;
    if (savedProjectRouting !== undefined) {
      projectRoutingManager.setProjectRouting(savedProjectRouting);
      services.cps?.cpsManager?.setProjectRouting(savedProjectRouting);
    }
  }, [projectRoutingManager, savedVis?.id, services.cps?.cpsManager]);

  return {
    projectRoutingManager,
    getProjectRouting: (): ProjectRouting | undefined => {
      return projectRoutingManager?.getProjectRouting();
    },
    getProjectRoutingForSave: (projectRoutingRestore: boolean) => {
      return projectRoutingManager?.getStateForSave(projectRoutingRestore) ?? {};
    },
    hasProjectRoutingRestore: (): boolean => {
      return (savedVis as any)?.project_routing !== undefined;
    },
  };
}

