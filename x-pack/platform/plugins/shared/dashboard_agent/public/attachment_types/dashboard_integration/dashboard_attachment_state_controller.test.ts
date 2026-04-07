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
import type {
  ExistingDashboardAttachmentState,
  PendingDashboardAttachmentState,
} from './dashboard_attachment_state';
import { createDashboardAttachmentStateController } from './dashboard_attachment_state_controller';
import { createExistingAttachmentState } from './existing_attachment_state';
import { createPendingAttachmentState } from './pending_attachment_state';

jest.mock('./existing_attachment_state');
jest.mock('./pending_attachment_state');

const mockedCreateExistingAttachmentState = jest.mocked(createExistingAttachmentState);
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
  const state: ExistingDashboardAttachmentState = {
    kind: 'existing',
    attachmentId,
    conversationId,
    data,
    persistedOrigin,
    localOrigin: undefined,
    cleanup: jest.fn(),
    getCurrentAttachment: () => ({
      id: attachmentId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data,
      origin: persistedOrigin,
    }),
  };

  return state;
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
    cleanup: jest.fn(),
    getCurrentAttachment: () => ({
      id: attachmentId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data,
      origin: undefined,
    }),
  };
};

describe('createDashboardAttachmentStateController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('reuses unchanged existing states by attachment id', () => {
    const attachment = createVersionedAttachment(
      createDashboardAttachment({
        id: 'dashboard-attachment-1',
        origin: 'dashboard-1',
      })
    );
    const existingState = createExistingState({
      attachmentId: 'dashboard-attachment-1',
      conversationId: 'conversation-1',
      data: attachment.versions[0].data,
      persistedOrigin: 'dashboard-1',
    });

    mockedCreateExistingAttachmentState.mockReturnValue(existingState);
    mockedCreatePendingAttachmentState.mockReturnValue(
      createPendingState({ attachmentId: 'pending-1' })
    );

    const controller = createDashboardAttachmentStateController({
      api: {} as DashboardApi,
      agentBuilder: {} as AgentBuilderPluginStart,
      checkSavedDashboardExist: jest.fn(),
    });

    controller.handleConversationChange({
      conversationId: 'conversation-1',
      attachments: [attachment],
    });
    controller.handleConversationChange({
      conversationId: 'conversation-1',
      attachments: [attachment],
    });

    expect(mockedCreateExistingAttachmentState).toHaveBeenCalledTimes(1);
    expect(existingState.cleanup).not.toHaveBeenCalled();
    expect(controller.getAttachments()).toEqual([existingState.getCurrentAttachment()]);
  });

  it('cleans up removed states and recreates changed ones', () => {
    const attachmentA = createVersionedAttachment(
      createDashboardAttachment({
        id: 'dashboard-attachment-a',
        origin: 'dashboard-a',
      })
    );
    const attachmentB = createVersionedAttachment(
      createDashboardAttachment({
        id: 'dashboard-attachment-b',
        origin: 'dashboard-b',
      })
    );
    const updatedAttachmentB = createVersionedAttachment(
      createDashboardAttachment({
        id: 'dashboard-attachment-b',
        origin: 'dashboard-b-updated',
      })
    );

    const stateA = createExistingState({
      attachmentId: 'dashboard-attachment-a',
      conversationId: 'conversation-1',
      data: attachmentA.versions[0].data,
      persistedOrigin: 'dashboard-a',
    });
    const stateB = createExistingState({
      attachmentId: 'dashboard-attachment-b',
      conversationId: 'conversation-1',
      data: attachmentB.versions[0].data,
      persistedOrigin: 'dashboard-b',
    });
    const updatedStateB = createExistingState({
      attachmentId: 'dashboard-attachment-b',
      conversationId: 'conversation-1',
      data: updatedAttachmentB.versions[0].data,
      persistedOrigin: 'dashboard-b-updated',
    });

    mockedCreateExistingAttachmentState
      .mockReturnValueOnce(stateA)
      .mockReturnValueOnce(stateB)
      .mockReturnValueOnce(updatedStateB);
    mockedCreatePendingAttachmentState.mockReturnValue(
      createPendingState({ attachmentId: 'pending-1' })
    );

    const controller = createDashboardAttachmentStateController({
      api: {} as DashboardApi,
      agentBuilder: {} as AgentBuilderPluginStart,
      checkSavedDashboardExist: jest.fn(),
    });

    controller.handleConversationChange({
      conversationId: 'conversation-1',
      attachments: [attachmentA, attachmentB],
    });
    controller.handleConversationChange({
      conversationId: 'conversation-1',
      attachments: [updatedAttachmentB],
    });

    expect(stateA.cleanup).toHaveBeenCalledTimes(1);
    expect(stateB.cleanup).toHaveBeenCalledTimes(1);
    expect(updatedStateB.cleanup).not.toHaveBeenCalled();
    expect(mockedCreateExistingAttachmentState).toHaveBeenCalledTimes(3);
    expect(controller.getAttachments()).toEqual([updatedStateB.getCurrentAttachment()]);
  });
});
