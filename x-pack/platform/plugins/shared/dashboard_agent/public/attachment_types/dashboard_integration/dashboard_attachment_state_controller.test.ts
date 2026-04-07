/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type {
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_state';
import { selectAttachmentFromState } from './dashboard_attachment_state_selectors';
import { createDashboardAttachmentStateController } from './dashboard_attachment_state_controller';
import { createExistingAttachmentState } from './existing_attachment_state';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { createPendingAttachmentState } from './pending_attachment_state';

jest.mock('./existing_attachment_state');
jest.mock('./origin_sync_subscription', () => ({
  createOriginSyncSubscription: jest.fn(() => ({
    unsubscribe: jest.fn(),
  })),
}));
jest.mock('./pending_attachment_state');

const mockedCreateExistingAttachmentState = jest.mocked(createExistingAttachmentState);
const mockedCreateOriginSyncSubscription = jest.mocked(createOriginSyncSubscription);
const mockedCreatePendingAttachmentState = jest.mocked(createPendingAttachmentState);

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

const createExistingState = ({
  attachmentId,
  conversationId,
  data,
  persistedOrigin,
}: {
  attachmentId: string;
  conversationId: string;
  data: DashboardAttachment['data'];
  persistedOrigin?: string;
}): ExistingDashboardAttachmentState => {
  return {
    kind: 'existing',
    attachmentId,
    conversationId,
    data,
    persistedOrigin,
    localOrigin: undefined,
  };
};

const createPendingState = ({
  attachmentId,
  conversationId,
}: {
  attachmentId: string;
  conversationId?: string;
}): PendingDashboardAttachmentState => {
  const data = createDashboardAttachment().data;

  return {
    kind: 'pending',
    attachmentId,
    conversationId,
    data,
    persistedOrigin: undefined,
    localOrigin: undefined,
  };
};

describe('createDashboardAttachmentStateController', () => {
  const createMockApi = () =>
    ({
      savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
      getSerializedState: jest.fn().mockReturnValue({
        attributes: {
          title: 'Test Dashboard',
          description: 'Test Description',
          panels: [],
        },
      }),
      onSave$: {
        subscribe: jest.fn(() => ({
          unsubscribe: jest.fn(),
        })),
      },
    } as unknown as DashboardApi);

  beforeEach(() => {
    jest.resetAllMocks();
    mockedCreateOriginSyncSubscription.mockReturnValue({
      unsubscribe: jest.fn(),
    } as never);
  });

  it('reuses unchanged existing states by attachment id', () => {
    const dashboardAttachment = createDashboardAttachment({
      id: 'dashboard-attachment-1',
      origin: 'dashboard-1',
    });
    const attachment = createVersionedAttachment(dashboardAttachment);
    const existingState = createExistingState({
      attachmentId: 'dashboard-attachment-1',
      conversationId: 'conversation-1',
      data: dashboardAttachment.data,
      persistedOrigin: 'dashboard-1',
    });

    mockedCreateExistingAttachmentState.mockReturnValue(existingState);
    mockedCreatePendingAttachmentState.mockReturnValue({
      state: createPendingState({ attachmentId: 'pending-1' }),
    } as never);

    const controller = createDashboardAttachmentStateController({
      api: createMockApi(),
      agentBuilder: {} as AgentBuilderPluginStart,
      checkSavedDashboardExist: jest.fn(),
    });

    controller.dispatch({
      type: 'conversation_changed',
      conversationId: 'conversation-1',
      attachments: [attachment],
    });
    controller.dispatch({
      type: 'conversation_changed',
      conversationId: 'conversation-1',
      attachments: [attachment],
    });

    expect(mockedCreateExistingAttachmentState).toHaveBeenCalledTimes(1);
    expect(controller.getAttachments()).toEqual([selectAttachmentFromState(existingState)]);
  });

  it('cleans up removed states and recreates changed ones', () => {
    const dashboardAttachmentA = createDashboardAttachment({
      id: 'dashboard-attachment-a',
      origin: 'dashboard-a',
    });
    const dashboardAttachmentB = createDashboardAttachment({
      id: 'dashboard-attachment-b',
      origin: 'dashboard-b',
    });
    const updatedDashboardAttachmentB = createDashboardAttachment({
      id: 'dashboard-attachment-b',
      origin: 'dashboard-b-updated',
    });
    const attachmentA = createVersionedAttachment(dashboardAttachmentA);
    const attachmentB = createVersionedAttachment(dashboardAttachmentB);
    const updatedAttachmentB = createVersionedAttachment(updatedDashboardAttachmentB);

    const stateA = createExistingState({
      attachmentId: 'dashboard-attachment-a',
      conversationId: 'conversation-1',
      data: dashboardAttachmentA.data,
      persistedOrigin: 'dashboard-a',
    });
    const stateB = createExistingState({
      attachmentId: 'dashboard-attachment-b',
      conversationId: 'conversation-1',
      data: dashboardAttachmentB.data,
      persistedOrigin: 'dashboard-b',
    });
    const updatedStateB = createExistingState({
      attachmentId: 'dashboard-attachment-b',
      conversationId: 'conversation-1',
      data: updatedDashboardAttachmentB.data,
      persistedOrigin: 'dashboard-b-updated',
    });

    mockedCreateExistingAttachmentState
      .mockReturnValueOnce(stateA)
      .mockReturnValueOnce(stateB)
      .mockReturnValueOnce(updatedStateB);
    mockedCreatePendingAttachmentState.mockReturnValue({
      state: createPendingState({ attachmentId: 'pending-1' }),
    } as never);

    const controller = createDashboardAttachmentStateController({
      api: createMockApi(),
      agentBuilder: {} as AgentBuilderPluginStart,
      checkSavedDashboardExist: jest.fn(),
    });

    controller.dispatch({
      type: 'conversation_changed',
      conversationId: 'conversation-1',
      attachments: [attachmentA, attachmentB],
    });
    controller.dispatch({
      type: 'conversation_changed',
      conversationId: 'conversation-1',
      attachments: [updatedAttachmentB],
    });

    expect(mockedCreateOriginSyncSubscription).toHaveBeenCalledTimes(3);
    expect(mockedCreateExistingAttachmentState).toHaveBeenCalledTimes(3);
    expect(controller.getAttachments()).toEqual([selectAttachmentFromState(updatedStateB)]);
  });

  it('dispatches manual change updates through the reducer path', () => {
    const controller = createDashboardAttachmentStateController({
      api: createMockApi(),
      agentBuilder: {
        addAttachment: jest.fn(),
      } as unknown as AgentBuilderPluginStart,
      checkSavedDashboardExist: jest.fn(),
    });

    controller.dispatch({
      type: 'manual_changed',
      currentOrigin: 'dashboard-1',
      currentDashboardData: createDashboardAttachment().data,
    });

    expect(controller.getAttachments()).toEqual([]);
  });
});
