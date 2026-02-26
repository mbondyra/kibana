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

const DEFAULT_NPRE_VALUE = '_alias:*';

jest.mock('./async_services', () => ({
  ...jest.requireActual('./async_services'),
}));

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
      get: jest.fn().mockResolvedValue(undefined),
      basePath: {
        get: jest.fn().mockReturnValue(''),
        serverBasePath: '',
      },
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
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('fetchProjects', () => {
    it('should fetch and store projects successfully', async () => {
      await cpsManager.whenReady();

      // Constructor's fetchTotalProjectCount fetches all projects
      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags', {
        body: JSON.stringify({ project_routing: '_alias:*' }),
      });

      jest.clearAllMocks();
      const result = await cpsManager.fetchProjects('_alias:_origin');

      // http.get returns undefined → defaultProjectRouting = undefined → getProjectRouting() = undefined
      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags', {
        body: JSON.stringify({ project_routing: '_alias:_origin' }),
      });
      expect(result).toEqual({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]],
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
      jest.clearAllMocks();
      await cpsManager.whenReady();
      await cpsManager.fetchProjects('_alias:_origin');
      expect(mockHttp.post).toHaveBeenCalledTimes(1); // initial for all projects + 1 fetch for _alias:_origin
      await cpsManager.fetchProjects('_alias:_origin');
      expect(mockHttp.post).toHaveBeenCalledTimes(1);
    });

    it('should not cache failed requests', async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      await cpsManager.whenReady();

      mockHttp.post.mockRejectedValue(new Error('Network error'));
      const promise = cpsManager.fetchProjects('_alias:_origin');
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Network error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      await cpsManager.whenReady();
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockHttp.post
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockResponse);

      const promise = cpsManager.fetchProjects('_alias:_origin');
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result!.origin).toEqual(mockOriginProject);
    });

    it('should throw error after max retries exceeded', async () => {
      await cpsManager.whenReady();
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Persistent error'));

      const promise = cpsManager.fetchProjects('_alias:_origin');
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Persistent error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should throw error on final failure', async () => {
      await cpsManager.whenReady();
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Error'));

      const promise = cpsManager.fetchProjects('_alias:_origin');
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow();
    });
  });

  describe('getProjectRouting with different access levels', () => {
    const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
      // Use a resolved NPRE value so defaultProjectRouting is populated for READONLY assertions
      mockHttp.get = jest.fn().mockResolvedValue(DEFAULT_NPRE_VALUE);
      cpsManager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
      });
    });

    const changeAccess = async (access: ProjectRoutingAccess) => {
      cpsManager.registerAppAccess('app', () => access);
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('app');
      await flushAsync();
    };

    it('returns undefined when access is DISABLED', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.DISABLED);

      expect(cpsManager.getProjectRouting()).toBeUndefined();
    });

    it('returns default project routing when access is READONLY', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.READONLY);

      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('returns current value when access is EDITABLE', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);

      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('returns the override value when provided', () => {
      expect(cpsManager.getProjectRouting('_alias:*')).toBe('_alias:*');
      expect(cpsManager.getProjectRouting('_alias:_origin')).toBe('_alias:_origin');
    });

    it('falls back to current projectRouting$ value when no override is provided', () => {
      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });

    it('resets to undefined when access changes from EDITABLE to DISABLED', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);
      cpsManager.setProjectRouting('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();
    });

    it('resets to default when access changes from EDITABLE to READONLY', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);
      cpsManager.setProjectRouting('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.READONLY);
      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('restores last editable routing when access returns to EDITABLE', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);
      cpsManager.setProjectRouting('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();

      await changeAccess(ProjectRoutingAccess.EDITABLE);
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });

    it('returns DEFAULT_PROJECT_ROUTING when no override and no explicit set', () => {
      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('returns undefined when access is DISABLED, regardless of override', async () => {
      await changeAccess(ProjectRoutingAccess.DISABLED);

      expect(cpsManager.getProjectRouting()).toBeUndefined();
      expect(cpsManager.getProjectRouting('_alias:_origin')).toBeUndefined();
    });

    it('resets projectRouting$ to default when access changes to DISABLED', async () => {
      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();

      await changeAccess(ProjectRoutingAccess.READONLY);
      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);

      await changeAccess(ProjectRoutingAccess.EDITABLE);
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });
  });
});
