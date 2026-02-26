/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CPSManager } from './cps_manager';
import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import type { CPSProject, ProjectTagsResponse } from '@kbn/cps-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { BehaviorSubject } from 'rxjs';

describe('CPSManager', () => {
  let mockHttp: jest.Mocked<HttpSetup>;
  const mockLogger = loggingSystemMock.createLogger();
  let mockApplication: ApplicationStart;
  let cpsManager: CPSManager;

  const mockOriginProject: CPSProject = {
    _id: 'origin-id',
    _alias: 'Origin Project',
    _type: 'observability',
    _csp: 'aws',
    _region: 'us-east-1',
    _organisation: 'org-1',
  };

  const mockLinkedProjects: CPSProject[] = [
    {
      _id: 'linked-1',
      _alias: 'B Project',
      _type: 'security',
      _csp: 'azure',
      _region: 'eastus',
      _organisation: 'org-2',
    },
    {
      _id: 'linked-2',
      _alias: 'A Project',
      _type: 'elasticsearch',
      _csp: 'gcp',
      _region: 'us-central1',
      _organisation: 'org-3',
    },
  ];

  const mockResponse: ProjectTagsResponse = {
    origin: { 'origin-id': mockOriginProject },
    linked_projects: {
      'linked-1': mockLinkedProjects[0],
      'linked-2': mockLinkedProjects[1],
    },
  };

  beforeEach(() => {
    mockHttp = {
      post: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as jest.Mocked<HttpSetup>;

    mockApplication = {
      currentAppId$: new BehaviorSubject<string | undefined>('discover'),
      currentLocation$: new BehaviorSubject<string>('#/'),
    } as unknown as ApplicationStart;

    cpsManager = new CPSManager({
      http: mockHttp,
      logger: mockLogger,
      application: mockApplication,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProjects', () => {
    it('should fetch and store projects successfully', async () => {
      const result = await cpsManager.fetchProjects();

      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags');
      expect(result).toEqual({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]], // sorted by alias
      });
    });

    it('should sort linked projects by alias', async () => {
      const result = await cpsManager.fetchProjects();

      expect(result!.linkedProjects[0]._alias).toBe('A Project');
      expect(result!.linkedProjects[1]._alias).toBe('B Project');
    });
  });

  describe('caching behavior', () => {
    it('should cache results and not refetch on subsequent calls', async () => {
      // First fetch
      await cpsManager.fetchProjects();
      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      // Second fetch should return cached data without calling HTTP
      await cpsManager.fetchProjects();
      expect(mockHttp.post).toHaveBeenCalledTimes(1);
    });

    it('should not cache failed requests', async () => {
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Network error'));

      // First fetch fails - run all timers to completion
      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Network error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useRealTimers();
    });
  });

  describe('refresh', () => {
    it('should refetch data when refresh is called', async () => {
      mockHttp.post.mockResolvedValue(mockResponse);

      // First fetch
      await cpsManager.fetchProjects();
      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      // Refresh should call HTTP again
      await cpsManager.refresh();
      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('should update cached data after refresh', async () => {
      const updatedProject: CPSProject = {
        ...mockOriginProject,
        _alias: 'Updated Project',
      };
      const updatedResponse: ProjectTagsResponse = {
        origin: { 'origin-id': updatedProject },
        linked_projects: mockResponse.linked_projects,
      };

      mockHttp.post.mockResolvedValueOnce(mockResponse);
      mockHttp.post.mockResolvedValueOnce(updatedResponse);

      // First fetch
      const result1 = await cpsManager.fetchProjects();
      expect(result1!.origin?._alias).toBe('Origin Project');

      // Refresh with new data
      const result2 = await cpsManager.refresh();
      expect(result2!.origin?._alias).toBe('Updated Project');

      // Subsequent fetch should return updated cached data
      const result3 = await cpsManager.fetchProjects();
      expect(result3!.origin?._alias).toBe('Updated Project');
      expect(mockHttp.post).toHaveBeenCalledTimes(2); // Only 2 calls, third was from cache
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      jest.useFakeTimers();
      mockHttp.post
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockResponse);

      const promise = cpsManager.fetchProjects();
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result!.origin).toEqual(mockOriginProject);

      jest.useRealTimers();
    });

    it('should throw error after max retries exceeded', async () => {
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Persistent error'));

      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Persistent error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useRealTimers();
    });

    it('should throw error on final failure', async () => {
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Error'));

      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('getProjectRouting', () => {
    const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

    const changeAccess = async (access: ProjectRoutingAccess) => {
      cpsManager.registerAppAccess('app', () => access);
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('app');
      await flushAsync();
    };

    it('returns the override value when provided', async () => {
      cpsManager.registerAppAccess('discover', () => ProjectRoutingAccess.EDITABLE);
      await flushAsync();

      expect(cpsManager.getProjectRouting('_alias:*')).toBe('_alias:*');
      expect(cpsManager.getProjectRouting('_alias:_origin')).toBe('_alias:_origin');
    });

    it('falls back to current projectRouting$ value when no override is provided', async () => {
      cpsManager.registerAppAccess('discover', () => ProjectRoutingAccess.EDITABLE);
      await flushAsync();

      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });

    it('returns undefined when no resolver is registered (defaults to DISABLED)', async () => {
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('unknownApp');
      await flushAsync();

      expect(cpsManager.getProjectRouting()).toBeUndefined();
    });

    it('returns undefined when access is DISABLED, regardless of override', async () => {
      await changeAccess(ProjectRoutingAccess.DISABLED);

      expect(cpsManager.getProjectRouting()).toBeUndefined();
      expect(cpsManager.getProjectRouting('_alias:_origin')).toBeUndefined();
    });

    it('resets projectRouting$ to default when access changes to DISABLED', async () => {
      cpsManager.registerAppAccess('discover', () => ProjectRoutingAccess.EDITABLE);
      await flushAsync();

      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();

      await changeAccess(ProjectRoutingAccess.EDITABLE);
      expect(cpsManager.getProjectRouting()).toBe('_alias:*');
    });
  });

  describe('registerAppAccess', () => {
    const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('uses a registered resolver to determine access', async () => {
      const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);
      cpsManager.registerAppAccess('discover', resolver);

      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('discover');
      (mockApplication.currentLocation$ as BehaviorSubject<string>).next('#/view/123');
      await flushAsync();

      expect(resolver).toHaveBeenCalledWith('#/view/123');
      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.READONLY);
    });

    it('defaults to DISABLED for apps without a registered resolver', async () => {
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('unregisteredApp');
      (mockApplication.currentLocation$ as BehaviorSubject<string>).next('#/');
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.DISABLED);
    });

    it('re-evaluates access immediately when registering for the current app', async () => {
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('stackAlerts');
      (mockApplication.currentLocation$ as BehaviorSubject<string>).next('#/rules');
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.DISABLED);

      const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);
      cpsManager.registerAppAccess('stackAlerts', resolver);
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.READONLY);
    });

    it('does not re-evaluate when registering for a different app', async () => {
      cpsManager.registerAppAccess('discover', () => ProjectRoutingAccess.EDITABLE);

      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('discover');
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.EDITABLE);

      const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);
      cpsManager.registerAppAccess('stackAlerts', resolver);
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.EDITABLE);
      expect(resolver).not.toHaveBeenCalled();
    });

    it('resolver can use runtime conditions to determine access', async () => {
      let featureEnabled = false;

      cpsManager.registerAppAccess('stackAlerts', (location) => {
        if (featureEnabled && location.includes('rules')) {
          return ProjectRoutingAccess.READONLY;
        }
        return ProjectRoutingAccess.DISABLED;
      });

      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('stackAlerts');
      (mockApplication.currentLocation$ as BehaviorSubject<string>).next('#/rules');
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.DISABLED);

      featureEnabled = true;
      (mockApplication.currentLocation$ as BehaviorSubject<string>).next('#/rules/new');
      await flushAsync();

      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.READONLY);
    });

    it('supports setup-phase registration via appAccessResolvers constructor param', async () => {
      const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);
      const preRegistered = new Map([['stackAlerts', resolver]]);

      const manager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
        appAccessResolvers: preRegistered,
      });

      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('stackAlerts');
      (mockApplication.currentLocation$ as BehaviorSubject<string>).next('#/rules');
      await flushAsync();

      expect(resolver).toHaveBeenCalledWith('#/rules');
      expect(manager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.READONLY);
    });

    it('setup-phase resolvers override defaults but defaults still apply for other apps', async () => {
      const overrideResolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);
      const manager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
        appAccessResolvers: new Map([['discover', overrideResolver]]),
      });

      // The override applies for 'discover'
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('discover');
      await flushAsync();
      expect(overrideResolver).toHaveBeenCalled();
      expect(manager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.READONLY);

      // The default still applies for 'maps'
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('maps');
      await flushAsync();
      expect(manager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.EDITABLE);
    });

    it('later registration overrides earlier one for the same app', async () => {
      cpsManager.registerAppAccess('discover', () => ProjectRoutingAccess.DISABLED);

      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('discover');
      await flushAsync();
      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.DISABLED);

      cpsManager.registerAppAccess('discover', () => ProjectRoutingAccess.EDITABLE);
      await flushAsync();
      expect(cpsManager.getProjectPickerAccess$().value).toBe(ProjectRoutingAccess.EDITABLE);
    });
  });
});
