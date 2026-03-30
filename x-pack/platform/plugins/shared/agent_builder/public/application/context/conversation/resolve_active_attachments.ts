/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { upsertAttachmentsIntoList } from './upsert_attachments_into_list';

interface ResolveActiveAttachmentsParams {
  attachments?: AttachmentInput[];
  newConversationAttachments?: AttachmentInput[];
  conversationId?: string;
}

export const resolveActiveAttachments = ({
  attachments,
  newConversationAttachments,
  conversationId,
}: ResolveActiveAttachmentsParams): AttachmentInput[] | undefined => {
  if (conversationId) {
    return attachments;
  }

  const nextAttachments = upsertAttachmentsIntoList(attachments, newConversationAttachments ?? []);
  return nextAttachments.length > 0 ? nextAttachments : undefined;
};
