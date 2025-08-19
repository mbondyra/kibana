/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiText } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useAlertCloseInfoModal } from './use_alert_close_info_modal';
import { useUiSetting$ } from '../../common/lib/kibana';
import { SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM } from '../../../common/constants';
import { render, waitFor } from '@testing-library/react';
import { screen } from '@elastic/eui/lib/test/rtl';
import { TestProviders, kibanaMock } from '../../common/mock';
import { act } from 'react-dom/test-utils';

jest.mock('../../common/hooks/use_experimental_features', () => {
  return {
    useIsExperimentalFeatureEnabled: jest.fn(),
  };
});

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../common/lib/kibana');

  return {
    ...actual,
    useUiSetting$: jest.fn(),
  };
});

const useUiSetting$Mock = useUiSetting$ as jest.Mock;

const TestComponent = () => {
  const { promptAlertCloseConfirmation } = useAlertCloseInfoModal();
  const [resolvedCount, setResolvedCount] = useState(0);
  const [resolvedResult, setResolvedResult] = useState<boolean | undefined>();
  const clickHandler = useCallback(async () => {
    const result = await promptAlertCloseConfirmation();
    setResolvedCount(resolvedCount + 1);
    setResolvedResult(result);
  }, [promptAlertCloseConfirmation, resolvedCount]);

  return (
    <>
      <EuiButton onClick={clickHandler} data-test-subj="triggerModalBtn">
        {'Click me'}
      </EuiButton>
      <EuiText>{`Resolved count: ${resolvedCount}`}</EuiText>
      <EuiText>{`Resolved result: ${resolvedResult}`}</EuiText>
    </>
  );
};

const renderTestComponent = () => {
  // Create custom start services with mocked openModal
  const mockStartServices = {
    ...kibanaMock,
    overlays: {
      ...kibanaMock.overlays,
      openModal: jest.fn(async (children) => {
        // Create a container element and call the mount function
        const container = document.createElement('div');
        document.body.appendChild(container);
        children(container);
        return { onClose: jest.fn(), close: jest.fn() };
      }),
    },
  };

  return render(
    <TestProviders startServices={mockStartServices}>
      <TestComponent />
    </TestProviders>
  );
};

describe('useAlertCloseInfoModal: promptAlertCloseConfirmation', () => {
  const triggerModal = async () => {
    act(() => screen.getByTestSubject('triggerModalBtn').click());
    await waitFor(() => {
      expect(screen.getByTestSubject('alertCloseInfoModal')).toBeInTheDocument();
      screen.debug();
    });
  };
  // const clickBtn = async (subj: string) => {
  //     const button = await screen.findByTestSubject(subj)
  //    button.click()
  // }
  // const clickConfirm = () => clickBtn('confirmModalConfirmButton')
  // const clickCancel = () => clickBtn('confirmModalCancelButton')

  beforeEach(() => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  });

  describe('when alert suppression should continue', () => {
    beforeEach(async () => {
      useUiSetting$Mock.mockReturnValue([
        SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow,
      ]);
      renderTestComponent();
      await triggerModal();
    });

    test('should show a modal when called', async () => {
      await expect(
        screen.findByText("Closing alert doesn't interrupt alert suppression")
      ).resolves.toBeInTheDocument();
      await expect(
        screen.findByText(
          "Duplicate events will continue to be grouped and suppressed, but new alerts won't be created for these groups."
        )
      ).resolves.toBeInTheDocument();
    });

    // test.only('should resolve when the user clicks confirm', async () => {
    //     renderTestComponent()
    //     triggerModal()
    //     const modalTitle = await screen.findByText("Closing alert doesn't interrupt alert suppression")
    //     console.log(modalTitle)
    //     const button = await screen.findByText("Confirm")
    //     act(() => button.click())
    //     expect(screen.findByText("Resolved count: 1")).resolves.toBeInTheDocument()
    //     expect(screen.findByText("Resolves result: true")).resolves.toBeInTheDocument()
    // })

    // test('should resolve when the user clicks cancel', async () => {
    //     await clickCancel()
    //     expect(screen.findByText("Resolved count: 1")).resolves.toBeInTheDocument()
    //     expect(screen.findByText("Resolves result: false")).resolves.toBeInTheDocument()
    // })

    // test('it should not show again when the user ticks do not show this message again')
  });

  // describe('when the feature flag is disabled', () => {

  // })
});
