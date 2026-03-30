/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import { syncDashboardChatConfig } from './dashboard_chat_config_sync';

type MockDashboardApi = DashboardApi & {
  savedObjectId$: BehaviorSubject<string | undefined>;
  layout$: BehaviorSubject<unknown>;
  title$: BehaviorSubject<string>;
  description$: BehaviorSubject<string | undefined>;
  filters$: BehaviorSubject<undefined>;
  query$: BehaviorSubject<undefined>;
  timeRange$: BehaviorSubject<undefined>;
  projectRouting$: BehaviorSubject<string | undefined>;
  hideTitle$: BehaviorSubject<boolean>;
  hideBorder$: BehaviorSubject<boolean>;
  settings: {
    autoApplyFilters$: BehaviorSubject<boolean>;
    syncColors$: BehaviorSubject<boolean>;
    syncCursor$: BehaviorSubject<boolean>;
    syncTooltips$: BehaviorSubject<boolean>;
    useMargins$: BehaviorSubject<boolean>;
  };
  children$: BehaviorSubject<Record<string, unknown>>;
  getSerializedState: jest.Mock;
};

const createMockDashboardApi = (savedObjectId?: string): MockDashboardApi => {
  return {
    savedObjectId$: new BehaviorSubject<string | undefined>(savedObjectId),
    layout$: new BehaviorSubject({}),
    title$: new BehaviorSubject<string>('Test Dashboard'),
    description$: new BehaviorSubject<string | undefined>(''),
    filters$: new BehaviorSubject<undefined>(undefined),
    query$: new BehaviorSubject<undefined>(undefined),
    timeRange$: new BehaviorSubject<undefined>(undefined),
    projectRouting$: new BehaviorSubject<string | undefined>(undefined),
    hideTitle$: new BehaviorSubject<boolean>(false),
    hideBorder$: new BehaviorSubject<boolean>(false),
    settings: {
      autoApplyFilters$: new BehaviorSubject<boolean>(true),
      syncColors$: new BehaviorSubject<boolean>(true),
      syncCursor$: new BehaviorSubject<boolean>(true),
      syncTooltips$: new BehaviorSubject<boolean>(true),
      useMargins$: new BehaviorSubject<boolean>(true),
    },
    children$: new BehaviorSubject<Record<string, unknown>>({}),
    getSerializedState: jest.fn().mockReturnValue({
      attributes: { title: 'Test Dashboard', description: '', panels: [] },
    }),
  } as unknown as MockDashboardApi;
};

describe('syncDashboardChatConfig', () => {
  let setChatConfig: jest.Mock;
  let clearChatConfig: jest.Mock;
  let dashboardAppClientApi$: BehaviorSubject<DashboardApi | undefined>;
  let cleanup: () => void;

  beforeEach(() => {
    jest.useFakeTimers();

    setChatConfig = jest.fn();
    clearChatConfig = jest.fn();
    dashboardAppClientApi$ = new BehaviorSubject<DashboardApi | undefined>(undefined);

    cleanup = syncDashboardChatConfig({
      agentBuilder: {
        setChatConfig,
        clearChatConfig,
      } as unknown as AgentBuilderPluginStart,
      dashboardPlugin: {
        dashboardAppClientApi$,
      } as unknown as DashboardStart,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('syncs a dashboard attachment when dashboard API becomes available', () => {
    dashboardAppClientApi$.next(createMockDashboardApi('dashboard-1'));

    expect(setChatConfig).toHaveBeenLastCalledWith({
      newConversationAttachments: [
        {
          id: 'dashboard-context',
          type: DASHBOARD_ATTACHMENT_TYPE,
          data: expect.objectContaining({ title: 'Test Dashboard', panels: [] }),
          origin: 'dashboard-1',
        },
      ],
    });
  });

  it('updates the staged attachment when dashboard state changes', () => {
    const api = createMockDashboardApi('dashboard-1');
    dashboardAppClientApi$.next(api);
    setChatConfig.mockClear();

    api.getSerializedState.mockReturnValue({
      attributes: { title: 'Updated Dashboard', description: '', panels: [] },
    });
    api.title$.next('Updated Dashboard');
    jest.advanceTimersByTime(151);

    expect(setChatConfig).toHaveBeenCalledWith({
      newConversationAttachments: [
        {
          id: 'dashboard-context',
          type: DASHBOARD_ATTACHMENT_TYPE,
          data: expect.objectContaining({ title: 'Updated Dashboard', panels: [] }),
          origin: 'dashboard-1',
        },
      ],
    });
  });

  it('clears staged dashboard config when dashboard API becomes unavailable', () => {
    dashboardAppClientApi$.next(createMockDashboardApi('dashboard-1'));
    setChatConfig.mockClear();

    dashboardAppClientApi$.next(undefined);

    expect(setChatConfig).toHaveBeenCalledWith({});
  });

  it('clears chat config on cleanup', () => {
    cleanup();

    expect(clearChatConfig).toHaveBeenCalled();
  });
});
