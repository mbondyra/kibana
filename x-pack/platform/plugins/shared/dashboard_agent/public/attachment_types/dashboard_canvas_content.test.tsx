/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DashboardCanvasContent } from './dashboard_canvas_content';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn(() => <div data-test-subj="dashboardRenderer" />),
}));

const MockSearchBar = jest.fn(() => <div data-test-subj="searchBar" />);

describe('DashboardCanvasContent', () => {
  const createMockDashboardApi = (): DashboardApi =>
    ({
      locator: {
        navigate: jest.fn().mockResolvedValue(undefined),
      },
      runQuickSave: jest.fn().mockResolvedValue(undefined),
      runInteractiveSave: jest.fn().mockResolvedValue({ id: 'new-dashboard-id' }),
      savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
      setViewMode: jest.fn(),
      setTimeRange: jest.fn(),
      timeRange$: new BehaviorSubject({ from: 'now-15m', to: 'now' }),
    } as unknown as DashboardApi);

  const mockAttachment: DashboardAttachment = {
    type: DASHBOARD_ATTACHMENT_TYPE,
    id: 'test-dashboard-id',
    data: {
      title: 'Test Dashboard',
      description: 'Test Description',
      panels: [],
    },
  };

  const defaultProps = {
    isSidebar: false,
    attachment: mockAttachment,
    dashboardLocator: undefined,
    searchBarComponent: MockSearchBar as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const simulateDashboardApiAvailable = (mockApi: DashboardApi) => {
    const mockDashboardRenderer = DashboardRenderer as jest.Mock;
    const onApiAvailable = mockDashboardRenderer.mock.calls[0]?.[0]?.onApiAvailable;
    if (onApiAvailable) {
      act(() => {
        onApiAvailable(mockApi);
      });
    }
  };

  type DashboardCanvasContentProps = React.ComponentProps<typeof DashboardCanvasContent>;

  const renderDashboardCanvasContent = (
    propsOverride: Partial<DashboardCanvasContentProps> = {}
  ) => {
    const registerActionButtons: jest.MockedFunction<
      DashboardCanvasContentProps['registerActionButtons']
    > = jest.fn();
    const updateOrigin: jest.MockedFunction<DashboardCanvasContentProps['updateOrigin']> = jest
      .fn()
      .mockResolvedValue(undefined);
    const closeCanvas: jest.MockedFunction<DashboardCanvasContentProps['closeCanvas']> = jest.fn();
    const doesSavedDashboardExist: jest.MockedFunction<
      DashboardCanvasContentProps['doesSavedDashboardExist']
    > = jest.fn().mockResolvedValue(false);
    const mockApi = createMockDashboardApi();

    const props: DashboardCanvasContentProps = {
      ...defaultProps,
      registerActionButtons,
      updateOrigin,
      closeCanvas,
      doesSavedDashboardExist,
      ...propsOverride,
    };

    const renderResult = render(<DashboardCanvasContent {...props} />);
    simulateDashboardApiAvailable(mockApi);

    return {
      ...renderResult,
      props,
      mockApi,
      registerActionButtons,
      updateOrigin,
      closeCanvas,
      doesSavedDashboardExist,
    };
  };

  it('renders the dashboard renderer and search bar', () => {
    const { queryByTestId } = renderDashboardCanvasContent();

    expect(queryByTestId('dashboardRenderer')).toBeInTheDocument();
    expect(queryByTestId('searchBar')).toBeInTheDocument();
  });

  it('registers action buttons when dashboard API becomes available', () => {
    const { registerActionButtons } = renderDashboardCanvasContent();

    expect(registerActionButtons).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Edit in Dashboards' }),
        expect.objectContaining({ label: 'Save' }),
      ])
    );
  });

  describe('Edit in Dashboards button', () => {
    it('should NOT call closeCanvas when isSidebar is false', async () => {
      const { registerActionButtons, closeCanvas, mockApi } = renderDashboardCanvasContent({
        isSidebar: false,
      });

      const buttons: ActionButton[] = registerActionButtons.mock.calls.at(-1)?.[0] ?? [];
      const editButton = buttons.find((b) => b.label === 'Edit in Dashboards');

      await act(async () => {
        await editButton?.handler();
      });

      expect(mockApi.locator?.navigate).toHaveBeenCalled();
      expect(closeCanvas).not.toHaveBeenCalled();
    });

    it('should call closeCanvas when isSidebar is true', async () => {
      const { registerActionButtons, closeCanvas, mockApi } = renderDashboardCanvasContent({
        isSidebar: true,
      });

      const buttons: ActionButton[] = registerActionButtons.mock.calls.at(-1)?.[0] ?? [];
      const editButton = buttons.find((b) => b.label === 'Edit in Dashboards');

      await act(async () => {
        await editButton?.handler();
      });

      expect(mockApi.locator?.navigate).toHaveBeenCalled();
      expect(closeCanvas).toHaveBeenCalled();
    });

    it('should navigate with correct dashboard state and time range', async () => {
      const { registerActionButtons, mockApi } = renderDashboardCanvasContent();

      const buttons: ActionButton[] = registerActionButtons.mock.calls.at(-1)?.[0] ?? [];
      const editButton = buttons.find((b) => b.label === 'Edit in Dashboards');

      await act(async () => {
        await editButton?.handler();
      });

      expect(mockApi.locator?.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          viewMode: 'edit',
          title: 'Test Dashboard',
          description: 'Test Description',
        })
      );
    });

    it('should include existing dashboard ID when saved object exists', async () => {
      const doesSavedDashboardExist = jest.fn().mockResolvedValue(true);

      const attachmentWithOrigin: DashboardAttachment = {
        ...mockAttachment,
        origin: { savedObjectId: 'existing-dashboard-id' },
      };

      const { registerActionButtons, mockApi } = renderDashboardCanvasContent({
        attachment: attachmentWithOrigin,
        doesSavedDashboardExist,
      });

      const buttons: ActionButton[] = registerActionButtons.mock.calls.at(-1)?.[0] ?? [];
      const editButton = buttons.find((b) => b.label === 'Edit in Dashboards');

      await act(async () => {
        await editButton?.handler();
      });

      expect(doesSavedDashboardExist).toHaveBeenCalledWith('existing-dashboard-id');
      expect(mockApi.locator?.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          dashboardId: 'existing-dashboard-id',
        })
      );
    });
  });

  describe('Save button', () => {
    it('should run quick save when linked saved object exists', async () => {
      const doesSavedDashboardExist = jest.fn().mockResolvedValue(true);

      const attachmentWithOrigin: DashboardAttachment = {
        ...mockAttachment,
        origin: { savedObjectId: 'existing-dashboard-id' },
      };

      const { registerActionButtons, mockApi } = renderDashboardCanvasContent({
        attachment: attachmentWithOrigin,
        doesSavedDashboardExist,
      });

      const buttons: ActionButton[] = registerActionButtons.mock.calls.at(-1)?.[0] ?? [];
      const saveButton = buttons.find((b) => b.label === 'Save');

      await act(async () => {
        await saveButton?.handler();
      });

      expect(mockApi.runQuickSave).toHaveBeenCalled();
    });

    it('should run interactive save and update origin for new dashboard', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons, mockApi } = renderDashboardCanvasContent({ updateOrigin });

      const buttons: ActionButton[] = registerActionButtons.mock.calls.at(-1)?.[0] ?? [];
      const saveButton = buttons.find((b) => b.label === 'Save');

      await act(async () => {
        await saveButton?.handler();
      });

      expect(mockApi.runInteractiveSave).toHaveBeenCalled();
      expect(updateOrigin).toHaveBeenCalledWith({ savedObjectId: 'new-dashboard-id' });
    });
  });
});
