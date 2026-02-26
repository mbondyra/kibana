/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  type CPSAppAccessResolver,
  type ICPSManager,
  type ProjectsData,
  PROJECT_ROUTING,
  ProjectRoutingAccess,
} from '@kbn/cps-utils';
import type { ProjectFetcher } from './project_fetcher';

/**
 * This should be configured on spaces level.
 * Common values: PROJECT_ROUTING.ALL (all projects, will be parsed to undefined on request level), '_alias:_origin' (origin project only)
 */
export const DEFAULT_PROJECT_ROUTING: ProjectRouting = PROJECT_ROUTING.ALL;

/**
 * Central service for managing project routing and project data.
 *
 * - Fetches project data from ES via `/internal/cps/projects_tags` endpoint (with caching and retry logic)
 * - Manages current project routing state using observables
 * - projectRouting$ represents temporary UI state; apps should reset to their saved value or DEFAULT_PROJECT_ROUTING on navigation
 */
export class CPSManager implements ICPSManager {
  private readonly http: HttpSetup;
  private readonly logger: Logger;
  private readonly application: ApplicationStart;
  private projectFetcherPromise: Promise<ProjectFetcher> | null = null;
  private readonly appAccessResolvers: Map<string, CPSAppAccessResolver>;
  private currentAppId: string = '';
  private currentLocation: string = '';
  private readonly projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(
    DEFAULT_PROJECT_ROUTING
  );
  private readonly projectPickerAccess$ = new BehaviorSubject<ProjectRoutingAccess>(
    ProjectRoutingAccess.EDITABLE
  );

  constructor(deps: {
    http: HttpSetup;
    logger: Logger;
    application: ApplicationStart;
    appAccessResolvers?: Map<string, CPSAppAccessResolver>;
  }) {
    this.http = deps.http;
    this.logger = deps.logger.get('cps_manager');
    this.application = deps.application;
    this.appAccessResolvers = new Map([...DEFAULT_APP_ACCESS, ...(deps.appAccessResolvers ?? [])]);
    combineLatest([this.application.currentAppId$, this.application.currentLocation$])
      .pipe(
        map(([appId, location]) => {
          this.currentAppId = appId ?? '';
          this.currentLocation = location ?? '';
          return this.resolveAccess(this.currentAppId, this.currentLocation);
        })
      )
      .subscribe((access) => {
        this.applyAccess(access);
      });
  }

  public registerAppAccess(appId: string, resolver: CPSAppAccessResolver): void {
    this.appAccessResolvers.set(appId, resolver);
    if (appId === this.currentAppId) {
      this.applyAccess(this.resolveAccess(this.currentAppId, this.currentLocation));
    }
  }

  private applyAccess(access: ProjectRoutingAccess): void {
    this.projectPickerAccess$.next(access);
    if (access === ProjectRoutingAccess.DISABLED) {
      this.projectRouting$.next(DEFAULT_PROJECT_ROUTING);
    }
  }

  private resolveAccess(appId: string, location: string): ProjectRoutingAccess {
    const resolver = this.appAccessResolvers.get(appId);
    return resolver?.(location) ?? ProjectRoutingAccess.DISABLED;
  }

  /**
   * Get the current project routing as an observable
   */
  public getProjectRouting$() {
    return this.projectRouting$.asObservable();
  }

  /**
   * Set the current project routing
   */
  public setProjectRouting(projectRouting: ProjectRouting) {
    this.projectRouting$.next(projectRouting);
  }

  /**
   * Get the current project routing value
   */
  public getProjectRouting(overrideValue?: ProjectRouting) {
    if (this.projectPickerAccess$.value === ProjectRoutingAccess.DISABLED) {
      return undefined;
    }
    return overrideValue ?? this.projectRouting$.value;
  }

  /**
   * Get the default project routing value from a global space setting.
   * This is the fallback value used when no app-specific or saved value exists.
   */
  public getDefaultProjectRouting(): ProjectRouting {
    return DEFAULT_PROJECT_ROUTING;
  }

  /**
   * Get the project picker access level as an observable.
   * This combines the current app ID and location to determine whether
   * the project picker should be editable, readonly, or disabled.
   */
  public getProjectPickerAccess$() {
    return this.projectPickerAccess$;
  }

  /**
   * Fetches projects from the server with caching and retry logic.
   * Returns cached data if already loaded. If a fetch is already in progress, returns the existing promise.
   * @returns Promise resolving to ProjectsData
   */
  public async fetchProjects(): Promise<ProjectsData | null> {
    const fetcher = await this.getProjectFetcher();
    return fetcher.fetchProjects();
  }

  /**
   * Forces a refresh of projects from the server, bypassing the cache.
   * @returns Promise resolving to ProjectsData
   */
  public async refresh(): Promise<ProjectsData | null> {
    const fetcher = await this.getProjectFetcher();
    return fetcher.refresh();
  }

  private async getProjectFetcher() {
    if (!this.projectFetcherPromise) {
      this.projectFetcherPromise = import('./async_services').then(({ createProjectFetcher }) =>
        createProjectFetcher(this.http, this.logger)
      );
    }
    return this.projectFetcherPromise;
  }
}


/**
 * Default access resolvers for known apps.
 * Apps that need dynamic runtime conditions (e.g. feature flags, config values)
 * should call `registerAppAccess` themselves -- that will override these defaults.
 */
const DEFAULT_APP_ACCESS: ReadonlyMap<string, CPSAppAccessResolver> = new Map([
  ['discover', () => ProjectRoutingAccess.EDITABLE],
  ['dashboards', (location: string) =>
    location.includes('list') ? ProjectRoutingAccess.DISABLED : ProjectRoutingAccess.EDITABLE],
  ['visualize', (location: string) =>
    location.includes('type:vega') ? ProjectRoutingAccess.EDITABLE : ProjectRoutingAccess.DISABLED],
  ['lens', () => ProjectRoutingAccess.EDITABLE],
  ['maps', () => ProjectRoutingAccess.EDITABLE],
  ['securitySolutionUI', (location: string) =>
    /dashboards\//.test(location) ? ProjectRoutingAccess.EDITABLE : ProjectRoutingAccess.DISABLED],
]);