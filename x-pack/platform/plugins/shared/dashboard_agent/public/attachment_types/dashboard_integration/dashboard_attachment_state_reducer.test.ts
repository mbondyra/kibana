/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardAttachmentStateAction } from './dashboard_attachment_state_actions';
import {
  type DashboardAttachmentReducerContext,
  type DashboardAttachmentControllerState,
  reduceDashboardAttachmentState,
} from './dashboard_attachment_state_reducer';

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

const createState = (
  overrides?: Partial<DashboardAttachmentControllerState>
): DashboardAttachmentControllerState => ({
  existingStates: [],
  ...overrides,
});

const reduceState = ({
  state,
  action,
  context,
}: {
  state: DashboardAttachmentControllerState;
  action: DashboardAttachmentStateAction;
  context: Partial<DashboardAttachmentReducerContext>;
}) =>
  reduceDashboardAttachmentState({
    state,
    action,
    context: {
      localPendingAttachments: [],
      ...context,
    },
  });

describe('reduceDashboardAttachmentState', () => {
  it('reuses an unchanged existing attachment state', () => {
    const attachment = createDashboardAttachment({
      id: 'attachment-1',
      origin: 'dashboard-1',
    });
    const existingState = {
      kind: 'existing' as const,
      conversationId: 'conversation-1',
      attachmentId: 'attachment-1',
      data: attachment.data,
      persistedOrigin: 'dashboard-1',
      localOrigin: undefined,
    };

    const result = reduceState({
      state: createState({
        existingStates: [existingState],
      }),
      action: {
        type: 'conversation_changed',
        conversationId: 'conversation-1',
        attachments: [createVersionedAttachment(attachment)],
      },
      context: {
        currentOrigin: 'dashboard-1',
        currentDashboardData: attachment.data,
      },
    });

    expect(result.state.existingStates[0]).toBe(existingState);
    expect(result.originSyncDescriptors).toEqual([]);
    expect(result.attachmentsToUpsert).toEqual([]);
  });

  it('reuses the pending state when the draft still matches', () => {
    const pendingState = {
      kind: 'pending' as const,
      conversationId: 'conversation-1',
      attachmentId: 'pending-1',
      data: createDashboardAttachment().data,
      persistedOrigin: 'dashboard-1',
      localOrigin: undefined,
    };

    const result = reduceState({
      state: createState({
        pendingState,
      }),
      action: {
        type: 'conversation_changed',
        conversationId: 'conversation-2',
        attachments: [],
      },
      context: {
        currentOrigin: 'dashboard-1',
        currentDashboardData: pendingState.data,
      },
    });

    expect(result.state.pendingState).toEqual({
      ...pendingState,
      conversationId: 'conversation-2',
    });
    expect(result.originSyncDescriptors).toEqual([]);
    expect(result.attachmentsToUpsert).toEqual([]);
  });

  it('returns a new pending attachment to publish when no reusable draft exists', () => {
    const dashboardData = createDashboardAttachment().data;

    const result = reduceState({
      state: createState(),
      action: {
        type: 'conversation_changed',
        conversationId: 'conversation-1',
        attachments: [],
      },
      context: {
        currentOrigin: undefined,
        currentDashboardData: dashboardData,
      },
    });

    expect(result.state.pendingState).toEqual(
      expect.objectContaining({
        kind: 'pending',
        conversationId: 'conversation-1',
        data: dashboardData,
      })
    );
    expect(result.attachmentsToUpsert).toEqual([
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardData,
      }),
    ]);
    expect(result.originSyncDescriptors).toEqual([
      expect.objectContaining({
        kind: 'pending',
      }),
    ]);
  });
  it('returns no attachment when there is no matching sync target', () => {
    const result = reduceState({
      state: createState(),
      action: {
        type: 'manual_changed',
      },
      context: {
        currentOrigin: 'dashboard-1',
        currentDashboardData: createDashboardAttachment().data,
      },
    });

    expect(result.attachmentsToUpsert).toEqual([]);
    expect(result.state).toEqual(createState());
  });

  it('returns an updated existing attachment when the current dashboard matches', () => {
    const updatedData = {
      ...createDashboardAttachment().data,
      title: 'Updated Title',
    };

    const result = reduceState({
      state: createState({
        existingStates: [
          {
            kind: 'existing',
            conversationId: 'conversation-1',
            attachmentId: 'attachment-1',
            data: createDashboardAttachment().data,
            persistedOrigin: 'dashboard-1',
            localOrigin: undefined,
          },
        ],
      }),
      action: {
        type: 'manual_changed',
      },
      context: {
        currentOrigin: 'dashboard-1',
        currentDashboardData: updatedData,
      },
    });

    expect(result.attachmentsToUpsert).toEqual([
      {
        id: 'attachment-1',
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: updatedData,
        origin: 'dashboard-1',
      },
    ]);
  });

  it('returns an updated pending attachment when editing an unsaved draft', () => {
    const updatedData = {
      ...createDashboardAttachment().data,
      title: 'Updated Draft Title',
    };

    const result = reduceState({
      state: createState({
        pendingState: {
          kind: 'pending',
          conversationId: 'conversation-1',
          attachmentId: 'pending-1',
          data: createDashboardAttachment().data,
          persistedOrigin: undefined,
          localOrigin: undefined,
        },
      }),
      action: {
        type: 'manual_changed',
      },
      context: {
        currentOrigin: undefined,
        currentDashboardData: updatedData,
      },
    });

    expect(result.attachmentsToUpsert).toEqual([
      {
        id: 'pending-1',
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: updatedData,
        origin: undefined,
      },
    ]);
  });
});
