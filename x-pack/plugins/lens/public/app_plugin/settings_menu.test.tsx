/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { makeLensStore } from '../mocks';
import { SettingsMenu } from './settings_menu';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

describe('settings menu', () => {
  const onCloseMock = jest.fn();

  const renderSettingsMenu = (propsOverrides = {}) => {
    const { store: lensStore } = makeLensStore({});

    const Wrapper: React.FC<{
      children: React.ReactNode;
    }> = ({ children }) => (
      <Provider store={lensStore}>
        <I18nProvider>{children}</I18nProvider>
      </Provider>
    );

    const rtlRender = render(
      <SettingsMenu
        anchorElement={document.createElement('button')}
        isOpen
        onClose={onCloseMock}
        {...propsOverrides}
      />,
      { wrapper: Wrapper }
    );

    const toggleAutoApply = () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      autoApplyToggle.click();
    };

    const isAutoApplyOn = () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      return autoApplyToggle.getAttribute('aria-checked') === 'true';
    };

    return {
      toggleAutoApply,
      isAutoApplyOn,
      ...rtlRender,
    };
  };

  afterEach(() => {
    onCloseMock.mockClear();
  });

  it('should call onClose when popover closes after toggling', async () => {
    const { toggleAutoApply } = renderSettingsMenu();
    toggleAutoApply();

    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it('should toggle auto-apply', async () => {
    const { toggleAutoApply, isAutoApplyOn } = renderSettingsMenu();

    expect(isAutoApplyOn()).toBeTruthy();

    toggleAutoApply();
    expect(isAutoApplyOn()).toBeFalsy();

    toggleAutoApply();
    expect(isAutoApplyOn()).toBeTruthy();
  });
});
