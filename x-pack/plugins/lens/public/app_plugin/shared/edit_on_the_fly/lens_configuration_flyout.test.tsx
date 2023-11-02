/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderWithReduxStore } from '../../../mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { mockVisualizationMap, mockDatasourceMap, mockDataPlugin } from '../../../mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import {
  LensEditConfigurationFlyout,
  type EditConfigPanelProps,
} from './lens_configuration_flyout';

const lensAttributes = {
  title: 'test',
  visualizationType: 'testVis',
  state: {
    datasourceStates: {
      testDatasource: {},
    },
    visualization: {},
    filters: [],
    query: {
      language: 'lucene',
      query: '',
    },
  },
  filters: [],
  query: {
    language: 'lucene',
    query: '',
  },
  references: [],
} as unknown as TypedLensByValueInput['attributes'];

const mockStartDependencies =
  createMockStartDependencies() as unknown as LensPluginStartDependencies;
const data = mockDataPlugin();
(data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
  from: 'now-2m',
  to: 'now',
});
const defaultProps = {
  attributes: lensAttributes,
  updatePanelState: jest.fn(),
  coreStart: coreMock.createStart(),
  startDependencies: { ...mockStartDependencies, data },
  datasourceMap: mockDatasourceMap(),
  visualizationMap: mockVisualizationMap(),
  closeFlyout: jest.fn(),
  datasourceId: 'testDatasource' as EditConfigPanelProps['datasourceId'],
};

describe('LensEditConfigurationFlyout', () => {
  function renderConfigFlyout(
    propsOverrides: Partial<EditConfigPanelProps> = {},
    query?: Query | AggregateQuery
  ) {
    return renderWithReduxStore(
      <LensEditConfigurationFlyout {...defaultProps} {...propsOverrides} />,
      {},
      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: 'testDatasource',
          query: query as Query,
        },
      }
    );
  }

  it('should display the header and the link to editor if necessary props are given', async () => {
    const navigateToLensEditorSpy = jest.fn();

    renderConfigFlyout({
      displayFlyoutHeader: true,
      navigateToLensEditor: navigateToLensEditorSpy,
    });
    expect(screen.getByTestId('editFlyoutHeader')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('navigateToLensEditorLink'));
    expect(navigateToLensEditorSpy).toHaveBeenCalled();
  });

  it('should call the closeFlyout callback if cancel button is clicked', async () => {
    const closeFlyoutSpy = jest.fn();

    renderConfigFlyout({
      closeFlyout: closeFlyoutSpy,
    });
    expect(screen.getByTestId('lns-layerPanel-0')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(closeFlyoutSpy).toHaveBeenCalled();
  });

  it('should call the updateByRefInput callback if cancel button is clicked and savedObjectId exists', async () => {
    const updateByRefInputSpy = jest.fn();

    renderConfigFlyout({
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
    });
    userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(updateByRefInputSpy).toHaveBeenCalled();
  });

  it('should call the saveByRef callback if apply button is clicked and savedObjectId exists', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();

    renderConfigFlyout({
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
    });
    userEvent.click(screen.getByRole('button', { name: /apply changes/i }));

    expect(updateByRefInputSpy).toHaveBeenCalled();
    expect(saveByRefSpy).toHaveBeenCalled();
  });

  it('save button is disabled if no changes have been made', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();
    const newProps = {
      ...defaultProps,
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
    };
    // todo: replace testDatasource with formBased or textBased as it's the only ones accepted
    // @ts-ignore
    newProps.attributes.state.datasourceStates.testDatasource = 'state';
    renderConfigFlyout(newProps);
    expect(screen.getByRole('button', { name: /apply changes/i })).toBeDisabled();
  });
  it('save button should be disabled if expression cannot be generated', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();
    const newProps = {
      ...defaultProps,
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
      datasourceMap: {
        ...defaultProps.datasourceMap,
        testDatasource: {
          ...defaultProps.datasourceMap.testDatasource,
          toExpression: jest.fn(() => null),
        },
      },
    };

    renderConfigFlyout(newProps);
    expect(screen.getByRole('button', { name: /apply changes/i })).toBeDisabled();
  });
});
