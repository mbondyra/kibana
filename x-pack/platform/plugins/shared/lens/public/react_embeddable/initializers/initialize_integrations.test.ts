/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';

import type { LensRuntimeState } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';

import { createEmptyLensState } from '../helper';
import { getLensAttributesMock, getLensRuntimeStateMock } from '../mocks';
import { getLensBuilder } from '../../lazy_builder';
import { initializeIntegrations } from './initialize_integrations';

jest.mock('../../lazy_builder', () => ({
  getLensBuilder: jest.fn(),
}));

function setupIntegrationsApi(stateOverrides?: Partial<LensRuntimeState>): LensApi {
  const runtimeState = getLensRuntimeStateMock(stateOverrides);
  const { api } = initializeIntegrations(() => runtimeState);
  return api as LensApi;
}

function createAttributesWithReferences() {
  const attributes = createEmptyLensState().attributes;
  attributes.references = [{ type: 'index-pattern', id: '1', name: 'indexpattern-datasource' }];
  return attributes;
}

describe('Dashboard services API', () => {
  describe('serializeState', () => {
    beforeEach(() => {
      (getLensBuilder as jest.Mock).mockReturnValue(null);
    });

    it('should work for a by-value panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({ attributes });
      const serializedState = api.serializeState();
      expect(serializedState).toEqual(expect.objectContaining({ attributes: expect.any(Object) }));
      expect((serializedState as { ref_id?: string }).ref_id).toBeUndefined();
    });

    it('should serialize state for a by-reference panel', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        ref_id: '123',
        attributes,
      });
      const serializedState = api.serializeState();
      expect(serializedState).not.toEqual(
        expect.objectContaining({ attributes: expect.anything() })
      );
    });

    it('should remove the searchSessionId from the serializedState', async () => {
      const attributes = createAttributesWithReferences();
      const api = setupIntegrationsApi({
        attributes,
        searchSessionId: faker.string.uuid(),
      });
      const serializedState = api.serializeState();
      expect('searchSessionId' in serializedState).toBeFalsy();
    });

    it('should flatten by-value serialized state when Lens API format is enabled', () => {
      (getLensBuilder as jest.Mock).mockReturnValue({
        isEnabled: true,
        getType: () => 'lnsXY',
        isSupported: () => true,
        toAPIFormat: () => ({ type: 'xy', index: 'my-index' }),
      });
      const api = setupIntegrationsApi({ attributes: getLensAttributesMock() });
      const serializedState = api.serializeState();
      expect('attributes' in serializedState).toBe(false);
      expect(serializedState).toMatchObject({ type: 'xy', index: 'my-index' });
    });

    /**
     * Repro for Sophie Chang report (Kibana 9.4.2 / #kibana-presentation):
     * by-value panels that only have a chart-level title (no panel override)
     * lose that title when lens.apiFormat flatten runs during serializeState.
     * Dashboard then caches / saves the title-less config.
     */
    it('drops chart-level title when flattening by-value state without a panel title', () => {
      const chartTitle = 'Treemap: widget count';
      (getLensBuilder as jest.Mock).mockReturnValue({
        isEnabled: true,
        getType: () => 'treemap',
        isSupported: () => true,
        toAPIFormat: () => ({
          type: 'treemap',
          title: chartTitle,
          index: 'my-index',
        }),
      });

      const attributes = getLensAttributesMock();
      attributes.title = chartTitle;
      // No panel-level title — UI shows chart title via defaultTitle$
      const api = setupIntegrationsApi({ attributes, title: undefined });

      const serializedState = api.serializeState();

      expect('attributes' in serializedState).toBe(false);
      // This is the bug: chart title is stripped and nothing remains at panel level
      expect((serializedState as { title?: string }).title).toBeUndefined();
    });
  });
});
