/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { resolveActiveAttachments } from './resolve_active_attachments';

const createAttachment = (id: string, type = 'test'): AttachmentInput => ({
  id,
  type,
  data: { value: id },
});

describe('resolveActiveAttachments', () => {
  it('returns regular attachments for existing conversations', () => {
    const attachments = [createAttachment('existing')];

    expect(
      resolveActiveAttachments({
        attachments,
        newConversationAttachments: [createAttachment('new-only')],
        conversationId: 'conversation-1',
      })
    ).toEqual(attachments);
  });

  it('merges regular and new-conversation attachments for new conversations', () => {
    expect(
      resolveActiveAttachments({
        attachments: [createAttachment('shared')],
        newConversationAttachments: [createAttachment('dashboard')],
      })
    ).toEqual([createAttachment('shared'), createAttachment('dashboard')]);
  });

  it('upserts matching ids when a contextual attachment refreshes', () => {
    expect(
      resolveActiveAttachments({
        attachments: [createAttachment('dashboard')],
        newConversationAttachments: [
          {
            id: 'dashboard',
            type: 'test',
            data: { value: 'updated' },
          },
        ],
      })
    ).toEqual([
      {
        id: 'dashboard',
        type: 'test',
        data: { value: 'updated' },
      },
    ]);
  });

  it('returns only new-conversation attachments when no regular attachments exist', () => {
    expect(
      resolveActiveAttachments({
        newConversationAttachments: [createAttachment('dashboard')],
      })
    ).toEqual([createAttachment('dashboard')]);
  });

  it('returns undefined when no attachments are configured', () => {
    expect(resolveActiveAttachments({})).toBeUndefined();
  });
});
