/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { notificationServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { KibanaFeature } from '@kbn/features-plugin/public';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { CreateSpacePage } from './create_space_page';
import type { SolutionView, Space } from '../../../common';
import { EventTracker } from '../../analytics';
import type { SpacesManager } from '../../spaces_manager';
import { spacesManagerMock } from '../../spaces_manager/mocks';

const space: Space = {
  id: 'my-space',
  name: 'My Space',
  disabledFeatures: [],
};

const featuresStart = featuresPluginMock.createStart();
featuresStart.getFeatures.mockResolvedValue([
  new KibanaFeature({
    id: 'feature-1',
    name: 'feature 1',
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: null,
  }),
]);

const reportEvent = jest.fn();
const eventTracker = new EventTracker({ reportEvent });

describe('ManageSpacePage', () => {
  let spacesManager: ReturnType<typeof spacesManagerMock.create>;
  let history: ReturnType<typeof scopedHistoryMock.create>;
  let notifications: ReturnType<typeof notificationServiceMock.createStartContract>;

  let user: ReturnType<typeof userEvent.setup>;

  const debugLog = (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log('[create_space_page.test]', ...args);
  };

  // Mock CPS manager for projectRouting tests
  const mockFetchProjects = jest.fn().mockResolvedValue({
    origin: {
      _alias: 'local_project',
      _id: 'abcde1234567890',
      _organization: 'org1234567890',
      _type: 'observability',
      env: 'local',
    },
    linkedProjects: [
      {
        _alias: 'linked_local_project',
        _id: 'badce1234567890',
        _organization: 'org1234567890',
        _type: 'observability',
        env: 'local',
      },
    ],
  });

  const mockCpsManager = {
    fetchProjects: mockFetchProjects,
  };

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    user = userEvent.setup();

    spacesManager = spacesManagerMock.create();
    history = scopedHistoryMock.create();
    notifications = notificationServiceMock.createStartContract();

    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);
  });

  it('allows a space to be created', async () => {
    debugLog('allows create - render start');
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    debugLog('allows create - form ready');

    await updateSpace(user, 'oblt');
    debugLog('allows create - updateSpace complete');

    const createButton = screen.getByTestId('save-space-button');
    await user.click(createButton);
    debugLog('allows create - clicked save');

    await waitFor(() => {
      expect(spacesManager.createSpace).toHaveBeenCalled();
    });
    debugLog('allows create - createSpace called');

    expect(spacesManager.createSpace).toHaveBeenCalledWith({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      initials: 'NS',
      color: '#EAAE01',
      imageUrl: '',
      disabledFeatures: [],
      projectRouting: undefined,
      solution: 'oblt',
    });
  }, 15000); // Temp increase to debug

  it('validates the form (name, initials, solution view...)', async () => {
    debugLog('validates form - render start');
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    debugLog('validates form - form ready');

    const createButton = screen.getByTestId('save-space-button');
    await user.click(createButton);
    debugLog('validates form - clicked save (expecting errors)');

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    debugLog('validates form - initial validation errors shown');
    expect(screen.getByText('Enter a URL identifier.')).toBeInTheDocument();
    expect(screen.getByText('Select a solution.')).toBeInTheDocument();
    expect(screen.getByText('Enter initials.')).toBeInTheDocument();

    expect(spacesManager.createSpace).not.toHaveBeenCalled();

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, 'New Space Name');

    await user.click(createButton);
    debugLog('validates form - clicked save after name update');

    // Wait for positive assertion, then check negatives synchronously
    expect(await screen.findByText('Select a solution.')).toBeInTheDocument();
    expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter a URL identifier.')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter initials.')).not.toBeInTheDocument();

    await updateSpace(user, 'oblt');

    await user.click(createButton);
    debugLog('validates form - clicked save after updateSpace');

    // Wait for validation error to disappear and create to be called
    await waitFor(() => {
      expect(screen.queryByText('Select a solution.')).not.toBeInTheDocument();
      expect(spacesManager.createSpace).toHaveBeenCalled();
    });
    debugLog('validates form - createSpace called');
  }, 15000); // Temp increase to debug

  it('shows solution view select when visible', async () => {
    debugLog('shows solution view - render start');
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        allowFeatureVisibility
        allowSolutionVisibility
        eventTracker={eventTracker}
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByTestId('navigationPanel')).toBeInTheDocument();
  });

  it('hides solution view select when not visible', async () => {
    debugLog('hides solution view - render start');
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        allowFeatureVisibility
        allowSolutionVisibility={false}
        eventTracker={eventTracker}
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.queryByTestId('navigationPanel')).not.toBeInTheDocument();
  });

  it('shows feature visibility controls when allowed', async () => {
    debugLog('shows feature controls - render start');
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    debugLog('shows feature controls - form ready');

    await updateSpace(user, 'classic');
    debugLog('shows feature controls - updateSpace classic complete');

    await screen.findByTestId('enabled-features-panel');
    debugLog('shows feature controls - enabled-features-panel present');
  }, 20000); // Temp increase to debug

  it('hides feature visibility controls when not allowed', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility={false}
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument();
  });

  it('hides feature visibility controls when solution view is not "classic"', async () => {
    debugLog('hides feature controls non-classic - render start');
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    debugLog('hides feature controls non-classic - form ready');

    await updateSpace(user, 'oblt');
    debugLog('hides feature controls non-classic - updateSpace oblt complete');

    await waitFor(() => {
      expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument();
    });
    debugLog('hides feature controls non-classic - panel hidden');

    await updateSpace(user, 'classic');
    debugLog('hides feature controls non-classic - updateSpace classic complete');

    await screen.findByTestId('enabled-features-panel');
    debugLog('hides feature controls non-classic - panel present again');
  }, 15000); // Temp increase to debug

  it('notifies when there is an error retrieving features', async () => {
    const error = new Error('something awful happened');

    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={() => Promise.reject(error)}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    await waitFor(() => {
      expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
        title: 'Error loading available features',
      });
    });
  });

  it('hides CustomizeCps component when project_routing capability is not present', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('shows CustomizeCps component when project_routing.manage_space_default capability is true', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
          project_routing: { manage_space_default: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
  });

  it('hides CustomizeCps component when project_routing.manage_space_default capability is false', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
          project_routing: { manage_space_default: false },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('includes projectRouting in createSpace call when provided', async () => {
    debugLog('projectRouting - render start');
    renderWithI18n(
      <KibanaContextProvider
        services={{
          cps: {
            cpsManager: mockCpsManager,
          },
          application: {
            capabilities: {
              navLinks: {},
              management: {},
              catalogue: {},
              spaces: { manage: true },
              project_routing: { manage_space_default: true },
            },
          },
        }}
      >
        <CreateSpacePage
          spacesManager={spacesManager as unknown as SpacesManager}
          getFeatures={featuresStart.getFeatures}
          notifications={notifications}
          history={history}
          capabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: { manage: true },
            project_routing: { manage_space_default: true },
          }}
          eventTracker={eventTracker}
          allowFeatureVisibility
          allowSolutionVisibility
        />
      </KibanaContextProvider>
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
    debugLog('projectRouting - form ready');

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    const descriptionInput = screen.getByRole('textbox', { name: /description/i });

    await user.clear(nameInput);
    await user.type(nameInput, 'New Space Name');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'some description');
    debugLog('projectRouting - name/description filled');

    await updateSpace(user, 'oblt');
    debugLog('projectRouting - updateSpace complete');

    // Wait for project picker to load and show projects
    await waitFor(
      () => {
        expect(mockCpsManager.fetchProjects).toHaveBeenCalled();
      },
      { timeout: 10000 }
    );
    debugLog('projectRouting - fetchProjects called');

    expect(await screen.findByText('local_project', {}, { timeout: 10000 })).toBeInTheDocument();
    debugLog('projectRouting - projects rendered');

    // Interact with project picker to set projectRouting - click "This project" button
    const thisProjectButton = await screen.findByRole('button', { name: /This project/i });
    await user.click(thisProjectButton);
    debugLog('projectRouting - selected origin project');

    const createButton = screen.getByTestId('save-space-button');
    await user.click(createButton);
    debugLog('projectRouting - clicked save');

    await waitFor(() => {
      expect(spacesManager.createSpace).toHaveBeenCalled();
    });
    debugLog('projectRouting - createSpace called');

    const callArgs = spacesManager.createSpace.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      solution: 'oblt',
      projectRouting: '_alias:_origin',
    });
  }, 10000);
});

async function updateSpace(user: ReturnType<typeof userEvent.setup>, solution?: SolutionView) {
  const debugLog = (...args: unknown[]) => {
    if (process.env.SPACES_TEST_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[create_space_page.test:updateSpace]', ...args);
    }
  };

  debugLog('start', { solution });

  const nameInput = screen.getByTestId('addSpaceName');
  const descriptionInput = screen.getByTestId('descriptionSpaceText');

  await user.clear(nameInput);
  await user.type(nameInput, 'New Space Name');
  await user.clear(descriptionInput);
  await user.type(descriptionInput, 'some description');
  debugLog('filled name/description');

  if (solution) {
    const solutionSelectButton = screen.getByTestId('solutionViewSelect');
    debugLog('solution trigger located');

    await waitFor(() => {
      expect(solutionSelectButton).not.toHaveStyle({ pointerEvents: 'none' });
      expect(solutionSelectButton).not.toBeDisabled();
    });
    debugLog('solution trigger interactable');

    await user.click(solutionSelectButton);
    debugLog('solution trigger clicked');

    const solutionOptionTestSubj = `solutionView${capitalizeFirstLetter(solution)}Option`;

    const solutionOption = await screen.findByTestId(solutionOptionTestSubj);
    debugLog('solution option located', solutionOptionTestSubj);

    await waitFor(() => {
      expect(solutionOption).toBeVisible();
      expect(solutionOption).not.toHaveStyle({ pointerEvents: 'none' });
    });
    debugLog('solution option interactable', solutionOptionTestSubj);

    await user.click(solutionOption);
    debugLog('solution option clicked', solutionOptionTestSubj);

    const expectedSolutionLabel =
      solution === 'classic' ? 'Classic' : solution === 'oblt' ? 'Observability' : solution;

    await waitFor(() => {
      expect(screen.getByTestId('solutionViewSelect')).toHaveTextContent(
        new RegExp(expectedSolutionLabel, 'i')
      );
    });
    debugLog('solution label updated', expectedSolutionLabel);

    await waitFor(() => {
      expect(screen.queryByTestId(solutionOptionTestSubj)).not.toBeInTheDocument();
    });
    debugLog('solution popover closed');
  }

  debugLog('end');
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
