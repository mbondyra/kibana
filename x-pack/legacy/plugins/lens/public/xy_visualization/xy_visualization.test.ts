/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization } from './xy_visualization';
import { Position } from '@elastic/charts';
import { Operation } from '../types';
import { State, SeriesType } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';
import { Ast } from '@kbn/interpreter/target/common';

jest.mock('../id_generator');

function exampleState(): State {
  return {
    legend: { position: Position.Bottom, isVisible: true },
    preferredSeriesType: 'bar',
    layers: [
      {
        layerId: 'first',
        seriesType: 'area',
        splitAccessor: 'd',
        xAccessor: 'a',
        accessors: ['b', 'c'],
      },
    ],
  };
}

describe('xy_visualization', () => {
  describe('getDescription', () => {
    function mixedState(...types: SeriesType[]) {
      const state = exampleState();
      return {
        ...state,
        layers: types.map((t, i) => ({
          ...state.layers[0],
          layerId: `layer_${i}`,
          seriesType: t,
        })),
      };
    }

    it('should show mixed xy chart when multilple series types', () => {
      const desc = xyVisualization.getDescription(mixedState('bar', 'line'));

      expect(desc.label).toEqual('Mixed XY chart');
    });

    it('should show the preferredSeriesType if there are no layers', () => {
      const desc = xyVisualization.getDescription(mixedState());

      // 'test-file-stub' is a hack, but it at least means we aren't using
      // a standard icon here.
      expect(desc.icon).toEqual('test-file-stub');
      expect(desc.label).toEqual('Bar chart');
    });

    it('should show mixed horizontal bar chart when multiple horizontal bar types', () => {
      const desc = xyVisualization.getDescription(
        mixedState('bar_horizontal', 'bar_horizontal_stacked')
      );

      expect(desc.label).toEqual('Mixed horizontal bar chart');
    });

    it('should show bar chart when bar only', () => {
      const desc = xyVisualization.getDescription(mixedState('bar_horizontal', 'bar_horizontal'));

      expect(desc.label).toEqual('Horizontal bar chart');
    });

    it('should show the chart description if not mixed', () => {
      expect(xyVisualization.getDescription(mixedState('area')).label).toEqual('Area chart');
      expect(xyVisualization.getDescription(mixedState('line')).label).toEqual('Line chart');
      expect(xyVisualization.getDescription(mixedState('area_stacked')).label).toEqual(
        'Stacked area chart'
      );
      expect(xyVisualization.getDescription(mixedState('bar_horizontal_stacked')).label).toEqual(
        'Stacked horizontal bar chart'
      );
    });
  });

  describe('#initialize', () => {
    it('loads default state', () => {
      const mockFrame = createMockFramePublicAPI();
      const initialState = xyVisualization.initialize(mockFrame);

      expect(initialState.layers).toHaveLength(1);
      expect(initialState.layers[0].xAccessor).not.toBeDefined();
      expect(initialState.layers[0].accessors).toHaveLength(0);

      expect(initialState).toMatchInlineSnapshot(`
        Object {
          "layers": Array [
            Object {
              "accessors": Array [],
              "layerId": "",
              "position": "top",
              "seriesType": "bar_stacked",
              "showGridlines": false,
            },
          ],
          "legend": Object {
            "isVisible": true,
            "position": "right",
          },
          "preferredSeriesType": "bar_stacked",
          "title": "Empty XY chart",
        }
      `);
    });

    it('loads from persisted state', () => {
      expect(xyVisualization.initialize(createMockFramePublicAPI(), exampleState())).toEqual(
        exampleState()
      );
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(xyVisualization.getPersistableState(exampleState())).toEqual(exampleState());
    });
  });

  describe('#removeLayer', () => {
    it('removes the specified layer', () => {
      const prevState: State = {
        ...exampleState(),
        layers: [
          ...exampleState().layers,
          {
            layerId: 'second',
            seriesType: 'area',
            splitAccessor: 'e',
            xAccessor: 'f',
            accessors: ['g', 'h'],
          },
        ],
      };

      expect(xyVisualization.removeLayer!(prevState, 'second')).toEqual(exampleState());
    });
  });

  describe('#appendLayer', () => {
    it('adds a layer', () => {
      const layers = xyVisualization.appendLayer!(exampleState(), 'foo').layers;
      expect(layers.length).toEqual(exampleState().layers.length + 1);
      expect(layers[layers.length - 1]).toMatchObject({ layerId: 'foo' });
    });
  });

  describe('#clearLayer', () => {
    it('clears the specified layer', () => {
      const layer = xyVisualization.clearLayer(exampleState(), 'first').layers[0];
      expect(layer).toMatchObject({
        accessors: [],
        layerId: 'first',
        seriesType: 'bar',
      });
    });
  });

  describe('#getLayerIds', () => {
    it('returns layerids', () => {
      expect(xyVisualization.getLayerIds(exampleState())).toEqual(['first']);
    });
  });

  describe('#setDimension', () => {
    it('sets the x axis', () => {
      expect(
        xyVisualization.setDimension({
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                seriesType: 'area',
                xAccessor: undefined,
                accessors: [],
              },
            ],
          },
          layerId: 'first',
          dimensionId: 'x',
          columnId: 'newCol',
        }).layers[0]
      ).toEqual({
        layerId: 'first',
        seriesType: 'area',
        xAccessor: 'newCol',
        accessors: [],
      });
    });

    it('replaces the x axis', () => {
      expect(
        xyVisualization.setDimension({
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                seriesType: 'area',
                xAccessor: 'a',
                accessors: [],
              },
            ],
          },
          layerId: 'first',
          dimensionId: 'x',
          columnId: 'newCol',
        }).layers[0]
      ).toEqual({
        layerId: 'first',
        seriesType: 'area',
        xAccessor: 'newCol',
        accessors: [],
      });
    });
  });

  describe('#removeDimension', () => {
    it('removes the x axis', () => {
      expect(
        xyVisualization.removeDimension({
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                seriesType: 'area',
                xAccessor: 'a',
                accessors: [],
              },
            ],
          },
          layerId: 'first',
          dimensionId: 'x',
          columnId: 'newCol',
        }).layers[0]
      ).toEqual({
        layerId: 'first',
        seriesType: 'area',
        xAccessor: undefined,
        accessors: [],
      });
    });
  });

  describe('#toExpression', () => {
    let mockDatasource: ReturnType<typeof createMockDatasource>;
    let frame: ReturnType<typeof createMockFramePublicAPI>;

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
        { columnId: 'd' },
        { columnId: 'a' },
        { columnId: 'b' },
        { columnId: 'c' },
      ]);

      mockDatasource.publicAPIMock.getOperationForColumnId.mockImplementation(col => {
        return { label: `col_${col}`, dataType: 'number' } as Operation;
      });

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    it('should map to a valid AST', () => {
      expect(xyVisualization.toExpression(exampleState(), frame)).toMatchSnapshot();
    });

    it('should default to labeling all columns with their column label', () => {
      const expression = xyVisualization.toExpression(exampleState(), frame)! as Ast;

      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('b');
      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('c');
      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('d');
      expect(expression.chain[0].arguments.xTitle).toEqual(['col_a']);
      expect(expression.chain[0].arguments.yTitle).toEqual(['col_b']);
      expect(
        (expression.chain[0].arguments.layers[0] as Ast).chain[0].arguments.columnToLabel
      ).toEqual([
        JSON.stringify({
          b: 'col_b',
          c: 'col_c',
          d: 'col_d',
        }),
      ]);
    });
  });

  describe('#getLayerOptions', () => {
    let mockDatasource: ReturnType<typeof createMockDatasource>;
    let frame: ReturnType<typeof createMockFramePublicAPI>;

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
        { columnId: 'd' },
        { columnId: 'a' },
        { columnId: 'b' },
        { columnId: 'c' },
      ]);

      // mockDatasource.publicAPIMock.getOperationForColumnId.mockImplementation(col => {
      //   return { label: `col_${col}`, dataType: 'number' } as Operation;
      // });

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    it('should return options for 3 dimensions', () => {
      const options = xyVisualization.getLayerOptions({
        state: exampleState(),
        frame,
        layerId: 'first',
        setState: jest.fn,
      }).dimensions;
      expect(options).toHaveLength(3);
      expect(options.map(o => o.dimensionId)).toEqual(['x', 'y', 'breakdown']);
    });

    it('should only accept bucketed operations for x', () => {
      const options = xyVisualization.getLayerOptions({
        state: exampleState(),
        frame,
        layerId: 'first',
        setState: jest.fn,
      }).dimensions;
      const filterOperations = options.find(o => o.dimensionId === 'x')!.filterOperations;

      const exampleOperation: Operation = {
        dataType: 'number',
        isBucketed: false,
        label: 'bar',
      };
      const bucketedOps: Operation[] = [
        { ...exampleOperation, isBucketed: true, dataType: 'number' },
        { ...exampleOperation, isBucketed: true, dataType: 'string' },
        { ...exampleOperation, isBucketed: true, dataType: 'boolean' },
        { ...exampleOperation, isBucketed: true, dataType: 'date' },
      ];
      const ops: Operation[] = [
        ...bucketedOps,
        { ...exampleOperation, dataType: 'number' },
        { ...exampleOperation, dataType: 'string' },
        { ...exampleOperation, dataType: 'boolean' },
        { ...exampleOperation, dataType: 'date' },
      ];
      expect(ops.filter(filterOperations)).toEqual(bucketedOps);
    });

    it('should not allow anything to be added to x', () => {
      const options = xyVisualization.getLayerOptions({
        state: exampleState(),
        frame,
        layerId: 'first',
        setState: jest.fn,
      }).dimensions;
      expect(options.find(o => o.dimensionId === 'x')?.supportsMoreColumns).toBe(false);
    });

    it('should allow number operations on y', () => {
      const options = xyVisualization.getLayerOptions({
        state: exampleState(),
        frame,
        layerId: 'first',
        setState: jest.fn,
      }).dimensions;
      const filterOperations = options.find(o => o.dimensionId === 'y')!.filterOperations;
      const exampleOperation: Operation = {
        dataType: 'number',
        isBucketed: false,
        label: 'bar',
      };
      const ops: Operation[] = [
        { ...exampleOperation, dataType: 'number' },
        { ...exampleOperation, dataType: 'string' },
        { ...exampleOperation, dataType: 'boolean' },
        { ...exampleOperation, dataType: 'date' },
      ];
      expect(ops.filter(filterOperations).map(x => x.dataType)).toEqual(['number']);
    });
  });
});
