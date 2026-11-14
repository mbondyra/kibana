/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, skip, Subject } from 'rxjs';
import { ChatEventType, type ChatEvent, type Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import { registerDashboardAppIntegration } from './dashboard_app_integration';
import { MANUAL_CHANGES_DEBOUNCE_MS } from './dashboard_equality';
import type { IdGenerator } from '..';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { createAttachmentLinks, type AttachmentLinks } from './attachment_links';
import type { DashboardLocator } from './open_in_dashboard_app';

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
  anyStateChange$: Observable<void>;
  savedObjectId$: BehaviorSubject<string | undefined>;
  onSave$: Subject<DashboardSaveEvent>;
  filters$: BehaviorSubject<unknown[]>;
  query$: BehaviorSubject<unknown>;
  timeRange$: BehaviorSubject<unknown>;
  getAppContext: () => { currentAppId: string };
  isEditableByUser: boolean;
  isManaged: boolean;
  setState: jest.Mock;
  setViewMode: jest.Mock;
  getSerializedState: jest.Mock;
  layout$: BehaviorSubject<{ panels: object; pinnedPanels: object }>;
  getChildApi: jest.Mock;
}

const createMockDashboardApi = (anyStateChange$: Observable<void>): MockDashboardApi => ({
  anyStateChange$,
  savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
  onSave$: new Subject<DashboardSaveEvent>(),
  filters$: new BehaviorSubject<unknown[]>([]),
  query$: new BehaviorSubject<unknown>({ query: '', language: 'kuery' }),
  timeRange$: new BehaviorSubject<unknown>({ from: 'now-15m', to: 'now' }),
  getAppContext: () => ({ currentAppId: 'dashboards' }),
  isEditableByUser: true,
  isManaged: false,
  setState: jest.fn().mockResolvedValue(undefined),
  setViewMode: jest.fn(),
  layout$: new BehaviorSubject({ panels: {}, pinnedPanels: {} }),
  getChildApi: jest.fn().mockResolvedValue(undefined),
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

const createActiveConversation = ({
  id,
  attachments,
}: {
  id?: string;
  attachments?: VersionedAttachment[];
}): ActiveConversation => ({
  id,
  conversation: id
    ? ({
        id,
        agent_id: 'test-agent',
        user: { id: 'user-1', username: 'user-1' },
        title: 'Test conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rounds: [],
        attachments,
      } as Conversation)
    : undefined,
});

describe('registerDashboardAppIntegration', () => {
  let mockApi: MockDashboardApi;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;
  let addAttachment: jest.Mock;
  let removeAttachment: jest.Mock;
  let updateAttachmentOrigin: jest.Mock;
  let getUpdateOrigin: jest.Mock;
  let checkSavedDashboardExist: jest.Mock;
  let draftAttachmentId: IdGenerator;
  let emitConversationChange: (change: {
    id?: string;
    attachments?: VersionedAttachment[];
  }) => void;
  let cleanup: () => void;
  let simulateDashboardStateChange: () => void;
  let simulateManualEdit: () => void;
  let toasts: ReturnType<typeof notificationServiceMock.createStartContract>['toasts'];
  let attachmentLinks: AttachmentLinks;

  beforeEach(() => {
    toasts = notificationServiceMock.createStartContract().toasts;
    attachmentLinks = createAttachmentLinks();
    const mockAnyStateChange$ = new BehaviorSubject(undefined);
    simulateDashboardStateChange = () => {
      mockAnyStateChange$.next(undefined);
    };
    simulateManualEdit = () => {
      mockApi.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });
      simulateDashboardStateChange();
    };
    jest.useFakeTimers();
    mockApi = createMockDashboardApi(mockAnyStateChange$.pipe(skip(1)));
    chatEventsByConversationId = new Map();
    addAttachment = jest.fn();
    removeAttachment = jest.fn();
    updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    getUpdateOrigin = jest.fn(
      (attachmentId: string) => async (origin: string) =>
        updateAttachmentOrigin('conversation-1', attachmentId, origin)
    );
    checkSavedDashboardExist = jest.fn().mockResolvedValue(true);
    let currentDraftAttachmentId = 'draft-attachment-id-1';
    draftAttachmentId = {
      get current() {
        return currentDraftAttachmentId;
      },
      next: jest.fn(() => {
        currentDraftAttachmentId = 'draft-attachment-id-2';
        return currentDraftAttachmentId;
      }),
    };
  });

  afterEach(() => {
    cleanup?.();
    jest.useRealTimers();
  });

  const register = ({
    canWriteDashboards = true,
    dashboardLocator,
  }: {
    canWriteDashboards?: boolean;
    dashboardLocator?: DashboardLocator;
  } = {}) => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    const agentBuilder = {
      addAttachment,
      removeAttachment,
      updateAttachmentOrigin,
      events: {
        getChatEvents$: jest.fn((conversationId: string) => {
          let chatEvents$ = chatEventsByConversationId.get(conversationId);

          if (!chatEvents$) {
            chatEvents$ = new Subject<ChatEvent>();
            chatEventsByConversationId.set(conversationId, chatEvents$);
          }

          return chatEvents$.asObservable();
        }),
        ui: { activeConversation$: activeConversation$.asObservable() },
      },
    } as unknown as AgentBuilderPluginStart;

    emitConversationChange = (change) => {
      activeConversation$.next(createActiveConversation(change));
    };

    cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: mockApi as unknown as DashboardApi,
      canWriteDashboards,
      dashboardLocator,
      toasts,
      draftAttachmentId,
      checkSavedDashboardExist,
      getUpdateOrigin,
      attachmentLinks,
    });
  };

  it('syncs manual dashboard changes for an existing dashboard attachment', async () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });
    jest.runOnlyPendingTimers();
    addAttachment.mockClear();

    simulateManualEdit();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
      })
    );
  });

  it('stages the attachment of a managed dashboard without linking it to the dashboard', () => {
    mockApi.savedObjectId$.next('managed-dashboard');
    mockApi.isManaged = true;
    register();
    emitConversationChange({});

    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-attachment-id-1', origin: undefined })
    );
  });

  it('stages manual changes of a managed dashboard as a new attachment, not an unlinked attachment of an existing conversation', async () => {
    mockApi.savedObjectId$.next('managed-dashboard');
    mockApi.isManaged = true;
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(createDashboardAttachment())],
    });

    jest.runOnlyPendingTimers();
    simulateManualEdit();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-attachment-id-1', origin: undefined })
    );
    expect(addAttachment).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dashboard-attachment-id' })
    );
  });

  const emitDashboardUpdated = (attachment: DashboardAttachment) =>
    chatEventsByConversationId.get('conversation-1')?.next({
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'tool',
        tool_call_id: 'call',
        custom_event: DASHBOARD_UPDATED_UI_EVENT,
        data: { attachment },
      },
    } as unknown as ChatEvent);

  const flushPromises = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  it("warns only once that the agent's changes weren't applied when the user can't write dashboards", async () => {
    register({ canWriteDashboards: false });
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    emitDashboardUpdated(createDashboardAttachment());
    emitDashboardUpdated(createDashboardAttachment());
    await flushPromises();

    expect(mockApi.setState).not.toHaveBeenCalled();
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
  });

  it("doesn't tell a user who can't write dashboards about a different dashboard", () => {
    mockApi.savedObjectId$.next('dashboard-1');
    register({ canWriteDashboards: false });
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    emitDashboardUpdated(createDashboardAttachment({ origin: 'dashboard-2' }));

    expect(toasts.addInfo).not.toHaveBeenCalled();
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });

  it('shows an error toast when the agent changes fail to apply', async () => {
    const error = new Error('Panel failed to load');
    mockApi.setState.mockRejectedValue(error);
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    emitDashboardUpdated(createDashboardAttachment());
    await flushPromises();

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: "Couldn't apply the agent's changes to the dashboard",
    });
  });

  it('tells the user when the agent updated a different dashboard, until they leave this one', () => {
    const toast = { id: 'toast-1' };
    toasts.addInfo.mockReturnValue(toast);
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    emitDashboardUpdated(createDashboardAttachment({ origin: 'dashboard-2' }));

    expect(mockApi.setState).not.toHaveBeenCalled();
    expect(toasts.addInfo).toHaveBeenCalledTimes(1);

    cleanup();

    expect(toasts.remove).toHaveBeenCalledWith(toast);
  });

  it('selects the matching existing dashboard attachment for manual sync', async () => {
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
    jest.runOnlyPendingTimers();
    addAttachment.mockClear();

    simulateManualEdit();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

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

  it("doesn't move an attachment whose dashboard was deleted to another dashboard that is saved", async () => {
    checkSavedDashboardExist.mockImplementation(
      async (dashboardId: string) => dashboardId === 'dashboard-1'
    );
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

    mockApi.onSave$.next({
      previousDashboardId: 'dashboard-3',
      dashboardId: 'dashboard-4',
      dashboardState: createDashboardSaveState(),
    });
    await flushPromises();

    expect(updateAttachmentOrigin).not.toHaveBeenCalled();
  });

  describe('links an unsaved dashboard to the attachment it shows', () => {
    const firstAttachment = createDashboardAttachment({ id: 'attachment-1' });
    const shownAttachment = createDashboardAttachment({ id: 'attachment-2' });

    const applyShownAttachment = async () => {
      register();
      emitConversationChange({
        id: 'conversation-1',
        attachments: [
          createVersionedAttachment(firstAttachment),
          createVersionedAttachment(shownAttachment),
        ],
      });
      jest.runOnlyPendingTimers();
      emitDashboardUpdated(shownAttachment);
      await flushPromises();
      addAttachment.mockClear();
    };

    it('so saving it sets the origin of that attachment, not the first one without a dashboard', async () => {
      await applyShownAttachment();

      mockApi.onSave$.next({
        previousDashboardId: undefined,
        dashboardId: 'new-dashboard',
        dashboardState: createDashboardSaveState(),
      });
      await flushPromises();

      expect(updateAttachmentOrigin).toHaveBeenCalledTimes(1);
      expect(updateAttachmentOrigin).toHaveBeenCalledWith(
        'conversation-1',
        'attachment-2',
        'new-dashboard'
      );
    });

    it('so manual changes are staged as that attachment', async () => {
      await applyShownAttachment();
      await jest.advanceTimersByTimeAsync(2 * MANUAL_CHANGES_DEBOUNCE_MS);

      mockApi.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

      expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: 'attachment-2' }));
    });

    it('so the new dashboard that opens with the changes to a managed dashboard stands for it', async () => {
      mockApi.savedObjectId$.next('managed-dashboard');
      mockApi.isManaged = true;
      const dashboardLocator = {
        navigate: jest.fn().mockResolvedValue(undefined),
      } as unknown as DashboardLocator;
      register({ dashboardLocator });
      emitConversationChange({});
      jest.runOnlyPendingTimers();
      emitConversationChange({ id: 'conversation-1', attachments: [] });
      jest.runOnlyPendingTimers();

      emitDashboardUpdated(createDashboardAttachment({ id: 'draft-attachment-id-1' }));
      await flushPromises();
      const newDashboardApi = { savedObjectId$: new BehaviorSubject(undefined) };
      attachmentLinks.claimNextDashboardLink(newDashboardApi as unknown as DashboardApi);

      expect(dashboardLocator.navigate).toHaveBeenCalled();
      expect(
        attachmentLinks.isLinked(
          newDashboardApi as unknown as DashboardApi,
          'draft-attachment-id-1'
        )
      ).toBe(true);
    });
  });

  it('creates a new attachment from the current dashboard state when switching away from a conversation', async () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    jest.runOnlyPendingTimers();
    addAttachment.mockClear();
    simulateManualEdit();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenCalledTimes(1);

    addAttachment.mockClear();
    emitConversationChange({ id: undefined, attachments: undefined });
    await jest.runOnlyPendingTimersAsync();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
        data: expect.any(Object),
      })
    );
  });

  it('stages the dashboard as a new attachment in an existing conversation without its attachment', async () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    await jest.runOnlyPendingTimersAsync();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-attachment-id-1', type: DASHBOARD_ATTACHMENT_TYPE })
    );
  });

  it('does not create a pending attachment on save when none exists yet', async () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    addAttachment.mockClear();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'saved-dashboard-id',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages the dashboard again when switching to another conversation without its attachment', async () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    await jest.runOnlyPendingTimersAsync();
    addAttachment.mockClear();

    emitConversationChange({ id: 'conversation-2', attachments: [] });
    await jest.runOnlyPendingTimersAsync();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-attachment-id-1' })
    );
  });

  it('stages manual changes as a new attachment in an existing conversation without its attachment', async () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    await jest.runOnlyPendingTimersAsync();
    addAttachment.mockClear();

    simulateManualEdit();
    await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'draft-attachment-id-1',
        data: expect.objectContaining({ title: 'Edited' }),
      })
    );
  });

  it('regenerates the pending attachment id once the draft attachment is in the conversation', async () => {
    register();

    emitConversationChange({ id: undefined, attachments: undefined });
    jest.runOnlyPendingTimers();

    const firstDraftAttachment = addAttachment.mock.calls[0]?.[0];
    expect(firstDraftAttachment).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
      })
    );

    addAttachment.mockClear();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(createDashboardAttachment({ id: firstDraftAttachment.id })),
      ],
    });

    emitConversationChange({ id: undefined, attachments: undefined });
    await jest.runOnlyPendingTimersAsync();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
      })
    );
    expect(addAttachment.mock.lastCall[0].id).not.toBe(firstDraftAttachment.id);
  });

  describe("doesn't stage the agent's own changes again", () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });

    const openConversationWithAttachment = () => {
      mockApi.savedObjectId$.next('dashboard-1');
      register();
      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(attachment)],
      });
      jest.runOnlyPendingTimers();
      addAttachment.mockClear();
    };

    it('when the conversation is fetched again after an agent round', async () => {
      openConversationWithAttachment();

      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(attachment)],
      });
      await jest.runOnlyPendingTimersAsync();

      expect(addAttachment).not.toHaveBeenCalled();
    });

    it('but stages a manual change the conversation fetched again does not have', async () => {
      openConversationWithAttachment();
      mockApi.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });

      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(attachment)],
      });
      await jest.runOnlyPendingTimersAsync();

      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dashboard-attachment-id',
          data: expect.objectContaining({ title: 'Edited' }),
        })
      );
    });

    it('when a new conversation gets its id once its first message is sent', async () => {
      register();
      emitConversationChange({});
      jest.runOnlyPendingTimers();
      const [[draftAttachment]] = addAttachment.mock.calls;
      addAttachment.mockClear();

      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(createDashboardAttachment(draftAttachment))],
      });
      await jest.runOnlyPendingTimersAsync();

      expect(addAttachment).not.toHaveBeenCalled();
    });

    it('when the dashboard changes from applying them', async () => {
      openConversationWithAttachment();

      emitDashboardUpdated(attachment);
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(2 * MANUAL_CHANGES_DEBOUNCE_MS);

      expect(mockApi.setState).toHaveBeenCalled();
      expect(addAttachment).not.toHaveBeenCalled();
    });

    it('but stages a manual change made after them', async () => {
      openConversationWithAttachment();
      emitDashboardUpdated(attachment);
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(2 * MANUAL_CHANGES_DEBOUNCE_MS);

      mockApi.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dashboard-attachment-id', origin: 'dashboard-1' })
      );
    });

    it('and unstages the manual change once the dashboard changes back to them', async () => {
      const agentChangesState = mockApi.getSerializedState();
      openConversationWithAttachment();
      emitDashboardUpdated(attachment);
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(2 * MANUAL_CHANGES_DEBOUNCE_MS);
      mockApi.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);
      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dashboard-attachment-id' })
      );
      addAttachment.mockClear();

      mockApi.getSerializedState.mockReturnValue(agentChangesState);
      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

      expect(addAttachment).not.toHaveBeenCalled();
      expect(removeAttachment).toHaveBeenCalledWith('dashboard-attachment-id');
    });
  });

  it("doesn't stage the attachment a new dashboard opened with when it takes over its link", async () => {
    const shownAttachment = createDashboardAttachment({ id: 'attachment-2' });
    attachmentLinks.linkNextDashboard(shownAttachment.id);
    attachmentLinks.claimNextDashboardLink(mockApi as unknown as DashboardApi);
    register();

    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(shownAttachment)],
    });
    await jest.runOnlyPendingTimersAsync();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages the changed dashboard as the linked attachment when switching from a new conversation to an existing one', async () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({});
    jest.runOnlyPendingTimers();
    addAttachment.mockClear();
    mockApi.getSerializedState.mockReturnValue({ attributes: { title: 'Edited', panels: [] } });

    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });
    await jest.runOnlyPendingTimersAsync();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-id',
        data: expect.objectContaining({ title: 'Edited' }),
      })
    );
  });

  it('removes the attachment it staged in the chat input when the user leaves the dashboard', () => {
    register();
    emitConversationChange({});
    jest.runOnlyPendingTimers();

    cleanup();

    expect(removeAttachment).toHaveBeenCalledWith('draft-attachment-id-1');
  });

  it("doesn't remove anything when the user leaves a dashboard that staged nothing", async () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });
    await jest.runOnlyPendingTimersAsync();

    cleanup();

    expect(removeAttachment).not.toHaveBeenCalled();
  });
});
