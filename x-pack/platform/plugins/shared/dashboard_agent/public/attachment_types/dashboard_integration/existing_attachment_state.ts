/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { type ExistingDashboardAttachmentState } from './dashboard_attachment_state';

export interface CreateExistingAttachmentStateParams {
  conversationId: string;
  attachment: VersionedAttachment;
  localOrigin?: string;
}

export const createExistingAttachmentState = ({
  conversationId,
  attachment,
  localOrigin,
}: CreateExistingAttachmentStateParams): ExistingDashboardAttachmentState => {
  return {
    kind: 'existing',
    conversationId,
    attachmentId: attachment.id,
    data: getLatestVersion(attachment)?.data as ExistingDashboardAttachmentState['data'],
    persistedOrigin: attachment.origin,
    localOrigin,
  };
};
