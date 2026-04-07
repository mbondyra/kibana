/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import {
  type DashboardAttachmentControllerState,
  reduceConversationChange,
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

describe('reduceConversationChange', () => {
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

    const result = reduceConversationChange({
      state: createState({
        existingStates: [existingState],
      }),
      conversationId: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
      currentOrigin: 'dashboard-1',
      currentDashboardData: attachment.data,
      localPendingAttachments: [],
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

    const result = reduceConversationChange({
      state: createState({
        pendingState,
      }),
      conversationId: 'conversation-2',
      attachments: [],
      currentOrigin: 'dashboard-1',
      currentDashboardData: pendingState.data,
      localPendingAttachments: [],
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

    const result = reduceConversationChange({
      state: createState(),
      conversationId: 'conversation-1',
      attachments: [],
      currentOrigin: undefined,
      currentDashboardData: dashboardData,
      localPendingAttachments: [],
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
});
