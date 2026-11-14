/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createAttachmentLinks, NEXT_DASHBOARD_LINK_TTL_MS } from './attachment_links';

const buildDashboardApi = (savedObjectId?: string) =>
  ({ savedObjectId$: new BehaviorSubject(savedObjectId) } as unknown as DashboardApi);

describe('createAttachmentLinks', () => {
  afterEach(() => jest.useRealTimers());

  it('finds the attachment linked last to a dashboard among the given ones', () => {
    const links = createAttachmentLinks();
    const api = buildDashboardApi();
    links.link(api, 'attachment-1');
    links.link(api, 'attachment-2');

    expect(
      links.findLinkedAttachment(api, [{ id: 'attachment-1' }, { id: 'attachment-2' }])
    ).toEqual({ id: 'attachment-2' });
    expect(links.findLinkedAttachment(api, [{ id: 'attachment-1' }])).toEqual({
      id: 'attachment-1',
    });
    expect(links.findLinkedAttachment(buildDashboardApi(), [{ id: 'attachment-1' }])).toBe(
      undefined
    );
  });

  it('links the next unsaved dashboard that opens to the attachment', () => {
    const links = createAttachmentLinks();
    const fromApi = buildDashboardApi('managed-dashboard');
    const newApi = buildDashboardApi();

    links.linkNextDashboard('attachment-1', { fromApi });
    links.claimNextDashboardLink(fromApi);
    links.claimNextDashboardLink(newApi);

    expect(links.isLinked(newApi, 'attachment-1')).toBe(true);
    expect(links.isLinked(fromApi, 'attachment-1')).toBe(false);
  });

  it('links only the first dashboard that opens, and only an unsaved one', () => {
    const links = createAttachmentLinks();
    const savedApi = buildDashboardApi('saved-dashboard');
    const laterApi = buildDashboardApi();

    links.linkNextDashboard('attachment-1');
    links.claimNextDashboardLink(savedApi);
    links.claimNextDashboardLink(laterApi);

    expect(links.isLinked(savedApi, 'attachment-1')).toBe(false);
    expect(links.isLinked(laterApi, 'attachment-1')).toBe(false);
  });

  it("doesn't link a dashboard that opens after the link expired, e.g. when navigation was cancelled", () => {
    jest.useFakeTimers();
    const links = createAttachmentLinks();
    const newApi = buildDashboardApi();

    links.linkNextDashboard('attachment-1');
    jest.advanceTimersByTime(NEXT_DASHBOARD_LINK_TTL_MS);
    links.claimNextDashboardLink(newApi);

    expect(links.isLinked(newApi, 'attachment-1')).toBe(false);
  });
});
