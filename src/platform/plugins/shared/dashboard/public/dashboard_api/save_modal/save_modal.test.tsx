/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';

jest.mock('@kbn/saved-objects-plugin/public', () => ({
  SavedObjectSaveModal: () => null,
  SavedObjectSaveModalWithSaveResult: ({
    children,
    renderOptions,
  }: {
    children: React.ReactNode;
    renderOptions: () => React.ReactNode;
  }) => (
    <div data-test-subj="save-modal">
      {children}
      {renderOptions?.()}
    </div>
  ),
}));

import { DashboardSaveModal } from './save_modal';

const mockSave = jest.fn();
const mockClose = jest.fn();

test('renders DashboardSaveModal', () => {
  const component = shallowWithI18nProvider(
    <DashboardSaveModal
      onSave={mockSave}
      onClose={mockClose}
      title="dash title"
      description="dash description"
      timeRestore={true}
      projectRoutingRestore={true}
      showCopyOnSave={true}
    />
  );
  expect(component).toMatchSnapshot();
});

describe('projectRoutingRestore prop', () => {
  test('should accept projectRoutingRestore prop as true', () => {
    const component = shallowWithI18nProvider(
      <DashboardSaveModal
        onSave={mockSave}
        onClose={mockClose}
        title="dash title"
        description="dash description"
        timeRestore={false}
        projectRoutingRestore={true}
        showCopyOnSave={false}
        showStoreProjectRoutingOnSave={true}
      />
    );

    expect(component).toBeDefined();
    // Verify component renders without errors
    expect(component.find('SavedObjectSaveModalWithSaveResult').exists()).toBe(true);
  });

  test('should accept projectRoutingRestore prop as false', () => {
    const component = shallowWithI18nProvider(
      <DashboardSaveModal
        onSave={mockSave}
        onClose={mockClose}
        title="dash title"
        description="dash description"
        timeRestore={false}
        projectRoutingRestore={false}
        showCopyOnSave={false}
        showStoreProjectRoutingOnSave={false}
      />
    );

    expect(component).toBeDefined();
    // Verify component renders without errors
    expect(component.find('SavedObjectSaveModalWithSaveResult').exists()).toBe(true);
  });

  test('should accept showStoreProjectRoutingOnSave prop', () => {
    const componentWithShow = shallowWithI18nProvider(
      <DashboardSaveModal
        onSave={mockSave}
        onClose={mockClose}
        title="dash title"
        description="dash description"
        timeRestore={false}
        projectRoutingRestore={false}
        showCopyOnSave={false}
        showStoreProjectRoutingOnSave={true}
      />
    );

    const componentWithoutShow = shallowWithI18nProvider(
      <DashboardSaveModal
        onSave={mockSave}
        onClose={mockClose}
        title="dash title"
        description="dash description"
        timeRestore={false}
        projectRoutingRestore={false}
        showCopyOnSave={false}
        showStoreProjectRoutingOnSave={false}
      />
    );

    // Both should render without errors
    expect(componentWithShow.find('SavedObjectSaveModalWithSaveResult').exists()).toBe(true);
    expect(componentWithoutShow.find('SavedObjectSaveModalWithSaveResult').exists()).toBe(true);
  });
});
