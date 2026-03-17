/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import {
  createRenderAttachmentRenderer,
  resolveAttachmentVersion,
} from './render_attachment_plugin';

describe('resolveAttachmentVersion', () => {
  const attachmentId = 'attachment-1';
  const currentVersion = 1;

  describe('when explicitVersion is provided', () => {
    it('returns the explicit version as a number', () => {
      const result = resolveAttachmentVersion({
        explicitVersion: 5,
        attachmentId,
        attachmentRefs: undefined,
        currentVersion,
      });

      expect(result).toBe(5);
    });

    it('parses a string explicit version to a number', () => {
      const result = resolveAttachmentVersion({
        explicitVersion: '3',
        attachmentId,
        attachmentRefs: undefined,
        currentVersion,
      });

      expect(result).toBe(3);
    });

    it('ignores attachmentRefs when explicit version is provided', () => {
      const attachmentRefs: AttachmentVersionRef[] = [{ attachment_id: attachmentId, version: 10 }];

      const result = resolveAttachmentVersion({
        explicitVersion: 2,
        attachmentId,
        attachmentRefs,
        currentVersion,
      });

      expect(result).toBe(2);
    });
  });

  describe('when explicitVersion is undefined', () => {
    it('returns currentVersion when attachmentRefs is undefined', () => {
      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs: undefined,
        currentVersion: 7,
      });

      expect(result).toBe(7);
    });

    it('returns currentVersion when attachmentRefs is empty', () => {
      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs: [],
        currentVersion: 4,
      });

      expect(result).toBe(4);
    });

    it('returns currentVersion when no refs match the attachmentId', () => {
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 99 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        currentVersion: 3,
      });

      expect(result).toBe(3);
    });

    it('returns the ref version when there is a single matching ref', () => {
      const attachmentRefs: AttachmentVersionRef[] = [{ attachment_id: attachmentId, version: 5 }];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        currentVersion: 1,
      });

      expect(result).toBe(5);
    });

    it('returns the highest version when multiple refs match the attachmentId', () => {
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: attachmentId, version: 2 },
        { attachment_id: attachmentId, version: 8 },
        { attachment_id: attachmentId, version: 5 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        currentVersion: 1,
      });

      expect(result).toBe(8);
    });

    it('only considers refs matching the attachmentId when finding the highest version', () => {
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 100 },
        { attachment_id: attachmentId, version: 3 },
        { attachment_id: attachmentId, version: 7 },
        { attachment_id: 'another-attachment', version: 50 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        currentVersion: 1,
      });

      expect(result).toBe(7);
    });
  });
});

describe('createRenderAttachmentRenderer', () => {
  it('uses version parsed by markdown plugin', () => {
    const render = createRenderAttachmentRenderer({
      attachmentsService: {} as never,
      conversationAttachments: [
        {
          id: 'attachment-1',
          type: 'test_type',
          versions: [
            {
              version: 1,
              data: { label: 'v1' },
              created_at: '2026-03-17T00:00:00.000Z',
              content_hash: 'hash-1',
            },
            {
              version: 2,
              data: { label: 'v2' },
              created_at: '2026-03-17T00:01:00.000Z',
              content_hash: 'hash-2',
            },
          ],
          current_version: 2,
        },
      ],
      attachmentRefs: undefined,
      conversationId: 'conversation-1',
      isSidebar: false,
    });

    const element = render({
      attachmentId: 'attachment-1',
      // Parser stores version under `version` on the node.
      version: '1',
    } as unknown as { attachmentId?: string; version?: string | number });

    expect(element).not.toBeNull();
    expect((element as any).props.version).toBe(1);
  });
});
