/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TimeRange } from '@kbn/es-query';
import { VisualizeLens } from '.';

jest.mock('@kbn/lens-embeddable-utils', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    fromAPIFormat: jest.fn(() => ({
      title: 'mock lens attributes',
      state: {
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                query: {
                  esql: 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS count = COUNT(*)',
                },
                columns: [],
              },
            },
          },
        },
      },
    })),
  })),
}));

jest.mock('../shared/base_visualization', () => ({
  BaseVisualization: ({
    lensInput,
    isLoading,
  }: {
    lensInput?: { id?: string; timeRange?: TimeRange };
    isLoading: boolean;
  }) => (
    <div
      data-test-subj="baseVisualization"
      data-testid="baseVisualization"
      data-is-loading={String(isLoading)}
      data-lens-input-id={lensInput?.id}
      data-layer-time-field={
        (lensInput?.attributes as LayerTimeFieldAttributes)?.state?.datasourceStates?.textBased
          ?.layers?.layer1?.timeField
      }
      data-time-range={JSON.stringify(lensInput?.timeRange)}
    />
  ),
}));

interface LayerTimeFieldAttributes {
  state?: {
    datasourceStates?: {
      textBased?: { layers?: Record<string, { timeField?: string }> };
    };
  };
}

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiSuperDatePicker: ({
      start,
      end,
      onTimeChange,
    }: {
      start: string;
      end: string;
      onTimeChange: ({ start, end }: { start: string; end: string }) => void;
    }) => (
      <button
        type="button"
        data-test-subj="mockSuperDatePicker"
        data-testid="mockSuperDatePicker"
        data-start={start}
        data-end={end}
        onClick={() => onTimeChange({ start: 'now-7d', end: 'now' })}
      >
        change time range
      </button>
    ),
  };
});

describe('VisualizeLens', () => {
  const createProps = (timeRange?: TimeRange) => ({
    lens: {
      stateHelperApi: jest.fn().mockResolvedValue({}),
    } as any,
    dataViews: {} as any,
    uiActions: {} as any,
    lensConfig: { type: 'pie' },
    timeRange,
  });

  it('initializes the picker and Lens input from the provided time range', async () => {
    render(<VisualizeLens {...createProps({ from: 'now-24h', to: 'now' })} />);

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-time-range',
        JSON.stringify({ from: 'now-24h', to: 'now' })
      )
    );

    expect(screen.getByTestId('mockSuperDatePicker')).toHaveAttribute('data-start', 'now-24h');
    expect(screen.getByTestId('mockSuperDatePicker')).toHaveAttribute('data-end', 'now');
  });

  it('defaults the picker and Lens input to the last 24 hours when no time range is provided', async () => {
    render(<VisualizeLens {...createProps()} />);

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-time-range',
        JSON.stringify({ from: 'now-24h', to: 'now' })
      )
    );

    expect(screen.getByTestId('mockSuperDatePicker')).toHaveAttribute('data-start', 'now-24h');
    expect(screen.getByTestId('mockSuperDatePicker')).toHaveAttribute('data-end', 'now');
  });

  it('sets the text-based layer timeField from the generated esql query when available', async () => {
    render(<VisualizeLens {...createProps()} />);

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-layer-time-field',
        '@timestamp'
      )
    );
  });

  it('updates the Lens input when the parent time range changes', async () => {
    const { rerender } = render(<VisualizeLens {...createProps({ from: 'now-24h', to: 'now' })} />);

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-time-range',
        JSON.stringify({ from: 'now-24h', to: 'now' })
      )
    );
    const initialLensInputId = screen
      .getByTestId('baseVisualization')
      .getAttribute('data-lens-input-id');

    rerender(<VisualizeLens {...createProps({ from: 'now-1h', to: 'now' })} />);

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-time-range',
        JSON.stringify({ from: 'now-1h', to: 'now' })
      )
    );

    expect(screen.getByTestId('mockSuperDatePicker')).toHaveAttribute('data-start', 'now-1h');
    expect(screen.getByTestId('baseVisualization').getAttribute('data-lens-input-id')).not.toBe(
      initialLensInputId
    );
  });

  it('updates the Lens input when the picker changes', async () => {
    render(<VisualizeLens {...createProps({ from: 'now-24h', to: 'now' })} />);

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-time-range',
        JSON.stringify({ from: 'now-24h', to: 'now' })
      )
    );
    const initialLensInputId = screen
      .getByTestId('baseVisualization')
      .getAttribute('data-lens-input-id');

    fireEvent.click(screen.getByTestId('mockSuperDatePicker'));

    await waitFor(() =>
      expect(screen.getByTestId('baseVisualization')).toHaveAttribute(
        'data-time-range',
        JSON.stringify({ from: 'now-7d', to: 'now' })
      )
    );
    expect(screen.getByTestId('baseVisualization').getAttribute('data-lens-input-id')).not.toBe(
      initialLensInputId
    );
  });
});
