/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import { registerDashboardAppIntegration } from './dashboard_app_integration';

const createDashboardSaveState = (): DashboardSaveEvent['dashboardState'] => ({
  title: 'Saved Dashboard',
  description: '',
  panels: [],
  pinned_panels: [],
  options: {
    hide_panel_titles: false,
    hide_panel_borders: false,
    use_margins: true,
    auto_apply_filters: true,
    sync_colors: false,
    sync_cursor: true,
    sync_tooltips: false,
  },
});

interface MockDashboardApi {
  savedObjectId$: BehaviorSubject<string | undefined>;
  onSave$: Subject<DashboardSaveEvent>;
  layout$: BehaviorSubject<unknown>;
  children$: BehaviorSubject<Record<string, MockChildApi>>;
  title$: BehaviorSubject<string>;
  description$: BehaviorSubject<string>;
  filters$: BehaviorSubject<unknown[]>;
  query$: BehaviorSubject<unknown>;
  timeRange$: BehaviorSubject<unknown>;
  projectRouting$: BehaviorSubject<unknown>;
  hideTitle$: BehaviorSubject<boolean>;
  hideBorder$: BehaviorSubject<boolean>;
  settings?: {
    autoApplyFilters$?: BehaviorSubject<boolean>;
    syncColors$?: BehaviorSubject<boolean>;
    syncCursor$?: BehaviorSubject<boolean>;
    syncTooltips$?: BehaviorSubject<boolean>;
    useMargins$?: BehaviorSubject<boolean>;
  };
  setState: jest.Mock;
  getSerializedState: jest.Mock;
}

interface MockChildApi {
  uuid: string;
  hasUnsavedChanges$: BehaviorSubject<boolean>;
  resetUnsavedChanges: jest.Mock;
  serializeState: jest.Mock;
  applySerializedState: jest.Mock;
}

const createMockDashboardApi = (): MockDashboardApi => ({
  savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
  onSave$: new Subject<DashboardSaveEvent>(),
  layout$: new BehaviorSubject<unknown>([]),
  children$: new BehaviorSubject<Record<string, MockChildApi>>({
    'panel-1': {
      uuid: 'panel-1',
      hasUnsavedChanges$: new BehaviorSubject<boolean>(false),
      resetUnsavedChanges: jest.fn(),
      serializeState: jest.fn().mockReturnValue({}),
      applySerializedState: jest.fn(),
    },
  }),
  title$: new BehaviorSubject<string>('Test Dashboard'),
  description$: new BehaviorSubject<string>('Test Description'),
  filters$: new BehaviorSubject<unknown[]>([]),
  query$: new BehaviorSubject<unknown>({ query: '', language: 'kuery' }),
  timeRange$: new BehaviorSubject<unknown>({ from: 'now-15m', to: 'now' }),
  projectRouting$: new BehaviorSubject<unknown>(undefined),
  hideTitle$: new BehaviorSubject<boolean>(false),
  hideBorder$: new BehaviorSubject<boolean>(false),
  settings: {
    autoApplyFilters$: new BehaviorSubject<boolean>(true),
    syncColors$: new BehaviorSubject<boolean>(false),
    syncCursor$: new BehaviorSubject<boolean>(true),
    syncTooltips$: new BehaviorSubject<boolean>(true),
    useMargins$: new BehaviorSubject<boolean>(true),
  },
  setState: jest.fn(),
  getSerializedState: jest.fn().mockReturnValue({
    attributes: {
      title: 'Test Dashboard',
      description: 'Test Description',
      panels: [],
    },
  }),
});

const createVersionedAttachment = (
  attachment: DashboardAttachment
): VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE> => ({
  id: attachment.id,
  type: attachment.type,
  versions: [
    {
      version: 1,
      data: attachment.data,
      created_at: new Date().toISOString(),
      content_hash: 'hash123',
    },
  ],
  current_version: 1,
  origin: attachment.origin,
});

const createDashboardAttachment = (
  overrides?: Partial<DashboardAttachment>
): DashboardAttachment => ({
  id: 'dashboard-attachment-id',
  type: DASHBOARD_ATTACHMENT_TYPE,
  data: {
    title: 'Test Dashboard',
    description: 'Test Description',
    panels: [],
  },
  origin: undefined,
  ...overrides,
});

describe('registerDashboardAppIntegration', () => {
  let mockApi: MockDashboardApi;
  let chat$: Subject<ChatEvent>;
  let addAttachment: jest.Mock;
  let updateAttachmentOrigin: jest.Mock;
  let checkSavedDashboardExist: jest.Mock;
  let emitConversationChange: (change: {
    id?: string;
    attachments?: VersionedAttachment[];
  }) => void;
  let cleanup: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockApi = createMockDashboardApi();
    chat$ = new Subject<ChatEvent>();
    addAttachment = jest.fn();
    updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    checkSavedDashboardExist = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup?.();
    jest.useRealTimers();
  });

  const register = () => {
    const listeners = new Set<
      (change: { id?: string; attachments?: VersionedAttachment[] }) => void
    >();
    const agentBuilder = {
      addAttachment,
      updateAttachmentOrigin,
      subscribeToConversationChanges: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      events: { chat$ },
    } as unknown as AgentBuilderPluginStart;

    emitConversationChange = (change) => {
      listeners.forEach((listener) => listener(change));
    };

    cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: mockApi as unknown as DashboardApi,
      checkSavedDashboardExist,
    });
  };

  it('syncs manual dashboard changes for an existing dashboard attachment', () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    mockApi.title$.next('Updated Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
      })
    );
  });

  it('selects the matching existing dashboard attachment for manual sync', () => {
    mockApi.savedObjectId$.next('dashboard-2');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(
          createDashboardAttachment({
            id: 'dashboard-attachment-1',
            origin: 'dashboard-1',
          })
        ),
        createVersionedAttachment(
          createDashboardAttachment({
            id: 'dashboard-attachment-2',
            origin: 'dashboard-2',
          })
        ),
      ],
    });

    mockApi.title$.next('Updated Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-2',
        origin: 'dashboard-2',
      })
    );
  });

  it('updates the persisted origin for an existing dashboard attachment on save', async () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    mockApi.onSave$.next({
      previousDashboardId: 'dashboard-1',
      dashboardId: 'dashboard-2',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();

    expect(updateAttachmentOrigin).toHaveBeenCalledWith(
      'conversation-1',
      'dashboard-attachment-id',
      'dashboard-2'
    );
  });

  it('creates a pending attachment state when the conversation has no dashboard attachment', () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: expect.any(Object),
      })
    );
  });

  it('updates the pending attachment origin after a save', async () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    addAttachment.mockClear();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'saved-dashboard-id',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'saved-dashboard-id',
      })
    );
  });
});
