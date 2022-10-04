/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint max-len: 0 */

import { i18n } from '@kbn/i18n';
import { SavedObject } from '@kbn/core/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
    type: 'search',
    updated_at: '2021-07-01T20:41:40.379Z',
    version: '1',
    migrationVersion: {
      search: '7.9.3',
    },
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.flightLogTitle', {
        defaultMessage: '[Flights] Flight Log',
      }),
      description: '',
      hits: 0,
      columns: [
        'Carrier',
        'OriginCityName',
        'OriginCountry',
        'DestCityName',
        'DestCountry',
        'FlightTimeMin',
        'AvgTicketPrice',
        'Cancelled',
        'FlightDelayType',
      ],
      sort: [['timestamp', 'desc']],
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"language":"kuery","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    attributes: {
      description: '',
      state: {
        adHocDataViews: {},
        datasourceStates: {
          indexpattern: {
            layers: {
              'd720208e-3a52-4db2-895a-eb8317a4e488': {
                columnOrder: [
                  '7fdc8895-5c5b-4204-af57-f64c053c4f91',
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X0',
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X1',
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X2',
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4',
                ],
                columns: {
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Percent Delays',
                    operationType: 'formula',
                    params: {
                      format: { id: 'percent' },
                      formula: "count(lucene='FlightDelay:true') / count(kql='*')",
                      isFormulaBroken: false,
                    },
                    references: ['1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X2'],
                    scale: 'ratio',
                  },
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X0': {
                    customLabel: true,
                    dataType: 'number',
                    filter: { language: 'lucene', query: 'FlightDelay:true' },
                    isBucketed: false,
                    label: "Part of count(lucene='FlightDelay:true') / count(kql='*')",
                    operationType: 'count',
                    params: { emptyAsNull: false },
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X1': {
                    customLabel: true,
                    dataType: 'number',
                    filter: { language: 'kuery', query: '*' },
                    isBucketed: false,
                    label: "Part of count(lucene='FlightDelay:true') / count(kql='*')",
                    operationType: 'count',
                    params: { emptyAsNull: false },
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X2': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: "Part of count(lucene='FlightDelay:true') / count(kql='*')",
                    operationType: 'math',
                    params: {
                      tinymathAst: {
                        args: [
                          '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X0',
                          '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X1',
                        ],
                        location: { max: 49, min: 0 },
                        name: 'divide',
                        text: "count(lucene='FlightDelay:true') / count(kql='*')",
                        type: 'function',
                      },
                    },
                    references: [
                      '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X0',
                      '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4X1',
                    ],
                    scale: 'ratio',
                  },
                  '7fdc8895-5c5b-4204-af57-f64c053c4f91': {
                    dataType: 'date',
                    isBucketed: true,
                    label: 'timestamp',
                    operationType: 'date_histogram',
                    params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
                    scale: 'interval',
                    sourceField: 'timestamp',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
          textBasedLanguages: { layers: {} },
        },
        filters: [],
        internalReferences: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
          fillOpacity: 0.5,
          fittingFunction: 'None',
          gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
          labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
          layers: [
            {
              accessors: ['1c232378-9bd3-47aa-a7fc-8ac68e4d52f4'],
              layerId: 'd720208e-3a52-4db2-895a-eb8317a4e488',
              layerType: 'data',
              palette: { name: 'default', type: 'palette' },
              seriesType: 'area',
              xAccessor: '7fdc8895-5c5b-4204-af57-f64c053c4f91',
              yConfig: [
                {
                  axisMode: 'left',
                  color: 'rgba(0,156,224,1)',
                  forAccessor: '1c232378-9bd3-47aa-a7fc-8ac68e4d52f4',
                },
              ],
            },
            {
              annotations: [
                {
                  color: '#0062B1',
                  extraFields: ['Carrier'],
                  filter: {
                    language: 'lucene',
                    query: 'FlightDelay:true AND Cancelled:true',
                    type: 'kibana_query',
                  },
                  icon: 'alert',
                  id: '53b7dff0-4c89-11e8-a66a-6989ad5a0a39',
                  key: { type: 'point_in_time' },
                  label: 'Flight Delayed and Cancelled!',
                  timeField: 'timestamp',
                  type: 'query',
                },
              ],
              ignoreGlobalFilters: true,
              layerId: '98408fbb-2af2-40ed-97a2-683646312d3b',
              layerType: 'annotations',
            },
          ],
          legend: {
            isVisible: false,
            maxLines: 1,
            position: 'bottom',
            shouldTruncate: true,
            showSingleSeries: false,
          },
          preferredSeriesType: 'bar_stacked',
          tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
          valueLabels: 'hide',
          yLeftExtent: { mode: 'custom', upperBound: 1 },
          yLeftScale: 'linear',
          yRightExtent: { mode: 'full' },
          yRightScale: 'linear',
        },
      },
      title: '[Flights] Delays and cancellations',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.6.0',
    id: 'bab60750-43fa-11ed-8117-55b7c4aaefc6',
    migrationVersion: { lens: '8.5.0' },
    references: [
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'indexpattern-datasource-layer-d720208e-3a52-4db2-895a-eb8317a4e488',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'xy-visualization-layer-98408fbb-2af2-40ed-97a2-683646312d3b',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2022-10-04T15:39:27.177Z',
    version: 'WzkyMTUsMV0=',
  },
  {
    id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: '1',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.delayBucketsTitle', {
        defaultMessage: '[Flights] Delay Buckets',
      }),
      visState:
        '{"title":"[Flights] Delay Buckets","type":"histogram","aggs":[{"id":"1","enabled":true,"type":"count","params":{},"schema":"metric"},{"id":"2","enabled":true,"type":"histogram","params":{"field":"FlightDelayMin","interval":30,"used_interval":30,"min_doc_count":false,"has_extended_bounds":false,"extended_bounds":{},"customLabel":"Flight Delay Minutes"},"schema":"segment"}],"params":{"type":"histogram","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100,"filter":true,"rotate":0},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":"true","type":"histogram","mode":"stacked","data":{"label":"Count","id":"1"},"valueAxis":"ValueAxis-1","drawLinesBetweenPoints":true,"showCircles":true}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false,"detailedTooltip":true,"palette":{"type":"palette","name":"default"},"isVislibVis":true,"radiusRatio":0,"labels":{"show":false},"thresholdLine":{"show":false,"value":10,"width":1,"style":"full","color":"#E7664C"}}}',
      uiStateJSON: '{"vis":{"legendOpen":false}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[{"meta":{"negate":true,"disabled":false,"alias":null,"type":"phrase","key":"FlightDelayMin","value":"0","params":{"query":0,"type":"phrase"},"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index"},"query":{"match":{"FlightDelayMin":{"query":0,"type":"phrase"}}},"$state":{"store":"appState"}}],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: '293b5a30-4c8f-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2021-07-07T01:48:55.366Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.destinationWeatherTitle', {
        defaultMessage: '[Flights] Destination Weather',
      }),
      visState:
        '{"title":"[Flights] Destination Weather","type":"tagcloud","aggs":[{"id":"1","enabled":true,"type":"count","params":{},"schema":"metric"},{"id":"2","enabled":true,"type":"terms","params":{"field":"DestWeather","orderBy":"1","order":"desc","size":10,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"},"schema":"segment"}],"params":{"scale":"linear","orientation":"single","minFontSize":12,"maxFontSize":46,"showLabel":false,"palette":{"type":"palette","name":"temperature"}}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
    type: 'visualization',
    updated_at: '2021-07-07T01:36:42.568Z',
    version: '4',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.airportConnectionsTitle', {
        defaultMessage: '[Flights] Airport Connections (Hover Over Airport)',
      }),
      visState:
        '{"title":"[Flights] Airport Connections (Hover Over Airport)","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v5.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 25, longitude: -70, zoom: 2}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_flights\\n        %context%: true\\n        // Uncomment to enable time filtering\\n        // %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            origins: {\\n              terms: {field: \\"OriginAirportID\\", size: 10000}\\n              aggs: {\\n                originLocation: {\\n                  top_hits: {\\n                    size: 1\\n                    _source: {\\n                      includes: [\\"OriginLocation\\", \\"Origin\\"]\\n                    }\\n                  }\\n                }\\n                distinations: {\\n                  terms: {field: \\"DestAirportID\\", size: 10000}\\n                  aggs: {\\n                    destLocation: {\\n                      top_hits: {\\n                        size: 1\\n                        _source: {\\n                          includes: [\\"DestLocation\\"]\\n                        }\\n                      }\\n                    }\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.origins.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            originLocation.hits.hits[0]._source.OriginLocation.lon\\n            originLocation.hits.hits[0]._source.OriginLocation.lat\\n          ]\\n        }\\n      ]\\n    }\\n    {\\n      name: selectedDatum\\n      on: [\\n        {trigger: \\"!selected\\", remove: true}\\n        {trigger: \\"selected\\", insert: \\"selected\\"}\\n      ]\\n    }\\n  ]\\n  signals: [\\n    {\\n      name: selected\\n      value: null\\n      on: [\\n        {events: \\"@airport:mouseover\\", update: \\"datum\\"}\\n        {events: \\"@airport:mouseout\\", update: \\"null\\"}\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: airportSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        {signal: \\"zoom*zoom*2+1\\"}\\n        {signal: \\"zoom*zoom*20+1\\"}\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      type: group\\n      from: {\\n        facet: {\\n          name: facetedDatum\\n          data: selectedDatum\\n          field: distinations.buckets\\n        }\\n      }\\n      data: [\\n        {\\n          name: facetDatumElems\\n          source: facetedDatum\\n          transform: [\\n            {\\n              type: geopoint\\n              projection: projection\\n              fields: [\\n                destLocation.hits.hits[0]._source.DestLocation.lon\\n                destLocation.hits.hits[0]._source.DestLocation.lat\\n              ]\\n            }\\n            {type: \\"formula\\", expr: \\"{x:parent.x, y:parent.y}\\", as: \\"source\\"}\\n            {type: \\"formula\\", expr: \\"{x:datum.x, y:datum.y}\\", as: \\"target\\"}\\n            {type: \\"linkpath\\", shape: \\"diagonal\\"}\\n          ]\\n        }\\n      ]\\n      scales: [\\n        {\\n          name: lineThickness\\n          type: log\\n          clamp: true\\n          range: [1, 8]\\n        }\\n        {\\n          name: lineOpacity\\n          type: log\\n          clamp: true\\n          range: [0.2, 0.8]\\n        }\\n      ]\\n      marks: [\\n        {\\n          from: {data: \\"facetDatumElems\\"}\\n          type: path\\n          interactive: false\\n          encode: {\\n            update: {\\n              path: {field: \\"path\\"}\\n              stroke: {value: \\"black\\"}\\n              strokeWidth: {scale: \\"lineThickness\\", field: \\"doc_count\\"}\\n              strokeOpacity: {scale: \\"lineOpacity\\", field: \\"doc_count\\"}\\n            }\\n          }\\n        }\\n      ]\\n    }\\n    {\\n      name: airport\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\"airportSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n          tooltip: {\\n            signal: \\"{title: datum.originLocation.hits.hits[0]._source.Origin + \' (\' + datum.key + \')\', connnections: length(datum.distinations.buckets), flights: datum.doc_count}\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: '1',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.departuresCountMapTitle', {
        defaultMessage: '[Flights] Departures Count Map',
      }),
      visState:
        '{"title":"[Flights] Departure Count Map","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v5.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 25, longitude: -40, zoom: 3}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_flights\\n        %context%: true\\n        %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            gridSplit: {\\n              geotile_grid: {field: \\"OriginLocation\\", precision: 4, size: 10000}\\n              aggs: {\\n                gridCentroid: {\\n                  geo_centroid: {\\n                    field: \\"OriginLocation\\"\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.gridSplit.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            gridCentroid.location.lon\\n            gridCentroid.location.lat\\n          ]\\n        }\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: gridSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        50\\n        1000\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      name: gridMarker\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\"gridSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n          tooltip: {\\n            signal: \\"{flights: datum.doc_count}\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    type: 'index-pattern',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: 'kibana_sample_data_flights',
      name: 'Kibana Sample Data Flights',
      timeFieldName: 'timestamp',
      fieldFormatMap:
        '{"hour_of_day":{"id":"number","params":{"pattern":"00"}},"AvgTicketPrice":{"id":"number","params":{"pattern":"$0,0.[00]"}}}',
      runtimeFieldMap:
        '{"hour_of_day":{"type":"long","script":{"source":"emit(doc[\'timestamp\'].value.getHour());"}}}',
    },
    references: [],
  },
  {
    id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    type: 'dashboard',
    namespaces: ['default'],
    updated_at: '2022-09-26T17:13:00.935Z',
    version: 'WzMzMTIsMV0=',
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.globalFlightDashboardTitle', {
        defaultMessage: '[Flights] Global Flight Dashboard',
      }),
      hits: 0,
      description: i18n.translate('home.sampleData.flightsSpec.globalFlightDashboardDescription', {
        defaultMessage:
          'Analyze mock flight data for ES-Air, Logstash Airways, Kibana Airlines and JetBeats',
      }),
      panelsJSON:
        '[{"version":"8.6.0","type":"search","gridData":{"x":0,"y":69,"w":48,"h":15,"i":"4"},"panelIndex":"4","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_4"},{"version":"8.6.0","type":"visualization","gridData":{"x":0,"y":16,"w":24,"h":9,"i":"7"},"panelIndex":"7","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_7"},{"version":"8.6.0","type":"visualization","gridData":{"x":0,"y":58,"w":24,"h":11,"i":"10"},"panelIndex":"10","embeddableConfig":{"vis":{"colors":{"Count":"#1F78C1"},"legendOpen":false},"enhancements":{}},"panelRefName":"panel_10"},{"version":"8.6.0","type":"visualization","gridData":{"x":36,"y":58,"w":12,"h":11,"i":"21"},"panelIndex":"21","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_21"},{"version":"8.6.0","type":"visualization","gridData":{"x":0,"y":36,"w":24,"h":22,"i":"23"},"panelIndex":"23","embeddableConfig":{"isLayerTOCOpen":true,"enhancements":{},"mapCenter":{"lat":34.65823,"lon":-112.44472,"zoom":4.28},"mapBuffer":{"minLon":-135,"minLat":21.94305,"maxLon":-90,"maxLat":48.9225},"openTOCDetails":[],"hiddenLayers":[]},"panelRefName":"panel_23"},{"version":"8.6.0","type":"visualization","gridData":{"x":24,"y":36,"w":24,"h":22,"i":"31"},"panelIndex":"31","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_31"},{"version":"8.6.0","type":"visualization","gridData":{"x":0,"y":0,"w":24,"h":8,"i":"6afc61f7-e2d5-45a3-9e7a-281160ad3eb9"},"panelIndex":"6afc61f7-e2d5-45a3-9e7a-281160ad3eb9","embeddableConfig":{"savedVis":{"title":"[Flights] Markdown Instructions","description":"","type":"markdown","params":{"fontSize":10,"openLinksInNewTab":true,"markdown":"## Sample Flight data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"uiState":{},"data":{"aggs":[],"searchSource":{}}},"hidePanelTitles":true,"enhancements":{}}},{"version":"8.6.0","type":"lens","gridData":{"x":24,"y":0,"w":8,"h":8,"i":"392b4936-f753-47bc-a98d-a4e41a0a4cd4"},"panelIndex":"392b4936-f753-47bc-a98d-a4e41a0a4cd4","embeddableConfig":{"enhancements":{},"attributes":{"title":"[Flights] Total Flights","description":"","visualizationType":"lnsLegacyMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"8fa993db-c147-4954-adf7-4ff264d42576":{"columns":{"81124c45-6ab6-42f4-8859-495d55eb8065":{"label":"Total flights","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true}},"columnOrder":["81124c45-6ab6-42f4-8859-495d55eb8065"],"incompleteColumns":{}}}}},"visualization":{"layerId":"8fa993db-c147-4954-adf7-4ff264d42576","accessor":"81124c45-6ab6-42f4-8859-495d55eb8065","layerType":"data","textAlign":"center","titlePosition":"bottom","size":"xl"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-8fa993db-c147-4954-adf7-4ff264d42576","type":"index-pattern"}]},"hidePanelTitles":true}},{"version":"8.6.0","type":"lens","gridData":{"x":32,"y":0,"w":8,"h":4,"i":"9271deff-5a61-4665-83fc-f9fdc6bf0c0b"},"panelIndex":"9271deff-5a61-4665-83fc-f9fdc6bf0c0b","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsLegacyMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0":{"label":"Part of count(kql=\'FlightDelay : true\') / count()","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"FlightDelay : true","language":"kuery"},"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1":{"label":"Part of count(kql=\'FlightDelay : true\') / count()","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2":{"label":"Part of count(kql=\'FlightDelay : true\') / count()","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"location":{"min":0,"max":41},"text":"count(kql=\'FlightDelay : true\') / count()"}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ec":{"label":"Delayed","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'FlightDelay : true\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"customLabel":true}},"columnOrder":["7e8fe9b1-f45c-4f3d-9561-30febcd357ec","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"incompleteColumns":{}}}}},"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","accessor":"7e8fe9b1-f45c-4f3d-9561-30febcd357ec","layerType":"data","textAlign":"center","titlePosition":"bottom","size":"xl"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317","type":"index-pattern"}]},"enhancements":{}}},{"version":"8.6.0","type":"lens","gridData":{"x":40,"y":0,"w":8,"h":4,"i":"aa591c29-1a31-4ee1-a71d-b829c06fd162"},"panelIndex":"aa591c29-1a31-4ee1-a71d-b829c06fd162","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsLegacyMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"c7851241-5526-499a-960b-357af8c2ce5bX0":{"label":"Part of Delayed","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX1":{"label":"Part of Delayed","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","timeShift":"1w","customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX2":{"label":"Part of Delayed","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"subtract","args":[{"type":"function","name":"divide","args":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"location":{"min":0,"max":28},"text":"count() / count(shift=\'1w\') "},1],"location":{"min":0,"max":31},"text":"count() / count(shift=\'1w\') - 1"}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5b":{"label":"Delayed vs 1 week earlier","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count() / count(shift=\'1w\') - 1","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX2"],"customLabel":true}},"columnOrder":["c7851241-5526-499a-960b-357af8c2ce5b","c7851241-5526-499a-960b-357af8c2ce5bX2","c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"incompleteColumns":{}}}}},"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","accessor":"c7851241-5526-499a-960b-357af8c2ce5b","layerType":"data","textAlign":"center","titlePosition":"bottom","size":"xl"},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":false,"disabled":false,"type":"phrase","key":"FlightDelay","params":{"query":true},"index":"filter-index-pattern-0"},"query":{"match_phrase":{"FlightDelay":true}},"$state":{"store":"appState"}}]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"filter-index-pattern-0","type":"index-pattern"}]},"enhancements":{}}},{"version":"8.6.0","type":"lens","gridData":{"x":32,"y":4,"w":8,"h":4,"i":"b766e3b8-4544-46ed-99e6-9ecc4847e2a2"},"panelIndex":"b766e3b8-4544-46ed-99e6-9ecc4847e2a2","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsLegacyMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0":{"label":"Part of Cancelled","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"Cancelled : true","language":"kuery"},"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1":{"label":"Part of Cancelled","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2":{"label":"Part of Cancelled","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"location":{"min":0,"max":39},"text":"count(kql=\'Cancelled : true\') / count()"}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ec":{"label":"Cancelled","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'Cancelled : true\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"customLabel":true}},"columnOrder":["7e8fe9b1-f45c-4f3d-9561-30febcd357ec","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"incompleteColumns":{}}}}},"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","accessor":"7e8fe9b1-f45c-4f3d-9561-30febcd357ec","layerType":"data","textAlign":"center","titlePosition":"bottom","size":"xl"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317","type":"index-pattern"}]},"enhancements":{}}},{"version":"8.6.0","type":"lens","gridData":{"x":40,"y":4,"w":8,"h":4,"i":"2e33ade5-96e5-40b4-b460-493e5d4fa834"},"panelIndex":"2e33ade5-96e5-40b4-b460-493e5d4fa834","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsLegacyMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"c7851241-5526-499a-960b-357af8c2ce5bX0":{"label":"Part of Delayed vs 1 week earlier","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX1":{"label":"Part of Delayed vs 1 week earlier","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","timeShift":"1w","customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX2":{"label":"Part of Delayed vs 1 week earlier","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"subtract","args":[{"type":"function","name":"divide","args":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"location":{"min":0,"max":28},"text":"count() / count(shift=\'1w\') "},1],"location":{"min":0,"max":31},"text":"count() / count(shift=\'1w\') - 1"}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5b":{"label":"Cancelled vs 1 week earlier","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count() / count(shift=\'1w\') - 1","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX2"],"customLabel":true}},"columnOrder":["c7851241-5526-499a-960b-357af8c2ce5b","c7851241-5526-499a-960b-357af8c2ce5bX2","c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"incompleteColumns":{}}}}},"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","accessor":"c7851241-5526-499a-960b-357af8c2ce5b","layerType":"data","textAlign":"center","titlePosition":"bottom","size":"xl"},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":false,"disabled":false,"type":"phrase","key":"Cancelled","params":{"query":true},"index":"filter-index-pattern-0"},"query":{"match_phrase":{"Cancelled":true}},"$state":{"store":"appState"}}]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"filter-index-pattern-0","type":"index-pattern"}]},"enhancements":{}}},{"version":"8.6.0","type":"lens","gridData":{"x":0,"y":8,"w":24,"h":8,"i":"086ac2e9-dd16-4b45-92b8-1e43ff7e3f65"},"panelIndex":"086ac2e9-dd16-4b45-92b8-1e43ff7e3f65","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"03c34665-471c-49c7-acf1-5a11f517421c":{"columns":{"a5b94e30-4e77-4b0a-9187-1d8b13de1456":{"label":"timestamp","dataType":"date","operationType":"date_histogram","sourceField":"timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto","includeEmptyRows":true}},"3e267327-7317-4310-aee3-320e0f7c1e70":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"}},"columnOrder":["a5b94e30-4e77-4b0a-9187-1d8b13de1456","3e267327-7317-4310-aee3-320e0f7c1e70"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"valueLabels":"hide","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"custom","lowerBound":0,"upperBound":1},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"layerId":"03c34665-471c-49c7-acf1-5a11f517421c","accessors":["3e267327-7317-4310-aee3-320e0f7c1e70"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"xAccessor":"a5b94e30-4e77-4b0a-9187-1d8b13de1456","layerType":"data"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-03c34665-471c-49c7-acf1-5a11f517421c","type":"index-pattern"}]},"hidePanelTitles":false,"enhancements":{}},"title":"[Flights] Flight count"},{"version":"8.6.0","type":"lens","gridData":{"x":24,"y":8,"w":24,"h":28,"i":"fb86b32f-fb7a-45cf-9511-f366fef51bbd"},"panelIndex":"fb86b32f-fb7a-45cf-9511-f366fef51bbd","embeddableConfig":{"attributes":{"title":"Cities by delay, cancellation","type":"lens","visualizationType":"lnsDatatable","state":{"datasourceStates":{"indexpattern":{"layers":{"f26e8f7a-4118-4227-bea0-5c02d8b270f7":{"columns":{"3dd24cb4-45ef-4dd8-b22a-d7b802cb6da0":{"label":"Top values of OriginCityName","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"OriginCityName","isBucketed":true,"params":{"size":1000,"orderBy":{"type":"alphabetical","fallback":true},"orderDirection":"asc","otherBucket":true,"missingBucket":false}},"52f6f2e9-6242-4c44-be63-b799150e7e60X0":{"label":"Part of Delay %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"FlightDelay : true ","language":"kuery"},"customLabel":true},"52f6f2e9-6242-4c44-be63-b799150e7e60X1":{"label":"Part of Delay %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"52f6f2e9-6242-4c44-be63-b799150e7e60X2":{"label":"Part of Delay %","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["52f6f2e9-6242-4c44-be63-b799150e7e60X0","52f6f2e9-6242-4c44-be63-b799150e7e60X1"],"location":{"min":0,"max":42},"text":"count(kql=\'FlightDelay : true \') / count()"}},"references":["52f6f2e9-6242-4c44-be63-b799150e7e60X0","52f6f2e9-6242-4c44-be63-b799150e7e60X1"],"customLabel":true},"52f6f2e9-6242-4c44-be63-b799150e7e60":{"label":"Delay %","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'FlightDelay : true \') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":0}}},"references":["52f6f2e9-6242-4c44-be63-b799150e7e60X2"],"customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0":{"label":"Part of Cancel %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"Cancelled: true","language":"kuery"},"customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1":{"label":"Part of Cancel %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X2":{"label":"Part of Cancel %","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1"],"location":{"min":0,"max":38},"text":"count(kql=\'Cancelled: true\') / count()"}},"references":["7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1"],"customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6":{"label":"Cancel %","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'Cancelled: true\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":0}}},"references":["7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X2"],"customLabel":true}},"columnOrder":["3dd24cb4-45ef-4dd8-b22a-d7b802cb6da0","52f6f2e9-6242-4c44-be63-b799150e7e60","52f6f2e9-6242-4c44-be63-b799150e7e60X0","52f6f2e9-6242-4c44-be63-b799150e7e60X1","52f6f2e9-6242-4c44-be63-b799150e7e60X2","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X2","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6"],"incompleteColumns":{}}}}},"visualization":{"columns":[{"isTransposed":false,"columnId":"3dd24cb4-45ef-4dd8-b22a-d7b802cb6da0","width":262.75},{"columnId":"52f6f2e9-6242-4c44-be63-b799150e7e60","isTransposed":false,"width":302.5,"colorMode":"cell","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#f7e0b8","stop":0.6},{"color":"#e7664c","stop":1}],"name":"custom","colorStops":[{"color":"#f7e0b8","stop":0.2},{"color":"#e7664c","stop":0.6}],"rangeType":"number","rangeMin":0.2,"rangeMax":0.6}},"alignment":"center"},{"columnId":"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6","isTransposed":false,"alignment":"center","colorMode":"cell","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#f7e0b8","stop":0.6},{"color":"#e7664c","stop":0.6666666666666666}],"rangeType":"number","name":"custom","colorStops":[{"color":"#f7e0b8","stop":0.2},{"color":"#e7664c","stop":0.6}],"rangeMin":0.2,"rangeMax":0.6}}}],"layerId":"f26e8f7a-4118-4227-bea0-5c02d8b270f7","sorting":{"columnId":"52f6f2e9-6242-4c44-be63-b799150e7e60","direction":"desc"},"layerType":"data","rowHeight":"single","rowHeightLines":1},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-f26e8f7a-4118-4227-bea0-5c02d8b270f7","type":"index-pattern"}]},"enhancements":{},"hidePanelTitles":false},"title":"[Flights] Most delayed cities"},{"version":"8.6.0","type":"lens","gridData":{"x":0,"y":25,"w":24,"h":11,"i":"0cc42484-16f7-42ec-b38c-9bf8be69cde7"},"panelIndex":"0cc42484-16f7-42ec-b38c-9bf8be69cde7","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"e80cc05e-c52a-4e5f-ac71-4b37274867f5":{"columns":{"caf7421e-93a3-439e-ab0a-fbdead93c21c":{"label":"Top values of FlightDelayType","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"FlightDelayType","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"0233d302-ec81-4fbe-96cb-7fac84cf035c"},"orderDirection":"desc","otherBucket":true,"missingBucket":false}},"13ec79e3-9d73-4536-9056-3d92802bb30a":{"label":"timestamp","dataType":"date","operationType":"date_histogram","sourceField":"timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto","includeEmptyRows":true}},"0233d302-ec81-4fbe-96cb-7fac84cf035c":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"}},"columnOrder":["caf7421e-93a3-439e-ab0a-fbdead93c21c","13ec79e3-9d73-4536-9056-3d92802bb30a","0233d302-ec81-4fbe-96cb-7fac84cf035c"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"bottom","legendSize":"auto"},"valueLabels":"hide","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":true,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_percentage_stacked","layers":[{"layerId":"e80cc05e-c52a-4e5f-ac71-4b37274867f5","accessors":["0233d302-ec81-4fbe-96cb-7fac84cf035c"],"position":"top","seriesType":"bar_percentage_stacked","showGridlines":false,"palette":{"type":"palette","name":"cool"},"xAccessor":"13ec79e3-9d73-4536-9056-3d92802bb30a","splitAccessor":"caf7421e-93a3-439e-ab0a-fbdead93c21c","layerType":"data"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-e80cc05e-c52a-4e5f-ac71-4b37274867f5","type":"index-pattern"}]},"hidePanelTitles":false,"enhancements":{}},"title":"[Flights] Delay Type"},{"version":"8.6.0","type":"lens","gridData":{"x":24,"y":58,"w":12,"h":11,"i":"5d53db36-2d5a-4adc-af7b-cec4c1a294e0"},"panelIndex":"5d53db36-2d5a-4adc-af7b-cec4c1a294e0","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsPie","state":{"datasourceStates":{"indexpattern":{"layers":{"0c8e136b-a822-4fb3-836d-e06cbea4eea4":{"columns":{"d1cee8bf-34cf-4141-99d7-ff043ee77b56":{"label":"Top values of FlightDelayType","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"FlightDelayType","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"aa152ace-ee2d-447b-b86d-459bef4d7880"},"orderDirection":"desc","otherBucket":true,"missingBucket":false}},"aa152ace-ee2d-447b-b86d-459bef4d7880":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"}},"columnOrder":["d1cee8bf-34cf-4141-99d7-ff043ee77b56","aa152ace-ee2d-447b-b86d-459bef4d7880"],"incompleteColumns":{}}}}},"visualization":{"shape":"pie","palette":{"type":"palette","name":"cool"},"layers":[{"layerId":"0c8e136b-a822-4fb3-836d-e06cbea4eea4","metric":"aa152ace-ee2d-447b-b86d-459bef4d7880","numberDisplay":"percent","categoryDisplay":"default","legendDisplay":"default","nestedLegend":false,"layerType":"data","legendSize":"auto","primaryGroups":["d1cee8bf-34cf-4141-99d7-ff043ee77b56"]}]},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"type":"phrase","key":"FlightDelayType","params":{"query":"No Delay"},"disabled":false,"negate":true,"alias":null,"index":"filter-index-pattern-0"},"query":{"match_phrase":{"FlightDelayType":"No Delay"}},"$state":{"store":"appState"}}]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-0c8e136b-a822-4fb3-836d-e06cbea4eea4","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"filter-index-pattern-0","type":"index-pattern"}]},"enhancements":{},"hidePanelTitles":false},"title":"[Flights] Delay Type"}]',
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      version: 1,
      timeRestore: true,
      timeTo: 'now',
      timeFrom: 'now-7d',
      refreshInterval: {
        pause: true,
        value: 0,
      },
      controlGroupInput: {
        controlStyle: 'oneLine',
        chainingSystem: 'HIERARCHICAL',
        panelsJSON:
          '{"85b632c8-3b7b-408d-8223-b0caccf75bd3":{"order":0,"width":"small","grow":true,"type":"optionsListControl","explicitInput":{"title":"Origin City","fieldName":"OriginCityName","id":"85b632c8-3b7b-408d-8223-b0caccf75bd3","selectedOptions":[],"enhancements":{}}},"d4dc9d2b-5850-402a-921d-8a2cd0107156":{"order":1,"width":"small","grow":true,"type":"optionsListControl","explicitInput":{"title":"Destination City","fieldName":"DestCityName","id":"d4dc9d2b-5850-402a-921d-8a2cd0107156","enhancements":{}}},"bee4a16a-f5c1-40b2-887e-db1b9ad9e15f":{"order":2,"width":"small","grow":true,"type":"rangeSliderControl","explicitInput":{"title":"Average Ticket Price","fieldName":"AvgTicketPrice","id":"bee4a16a-f5c1-40b2-887e-db1b9ad9e15f","enhancements":{}}}}',
        ignoreParentSettingsJSON:
          '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
      },
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"language":"kuery","query":""},"highlightAll":true,"version":true,"filter":[]}',
      },
    },
    references: [
      {
        name: '4:panel_4',
        type: 'search',
        id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
      },
      {
        name: '7:panel_7',
        type: 'lens',
        id: 'bab60750-43fa-11ed-8117-55b7c4aaefc6',
      },
      {
        name: '10:panel_10',
        type: 'visualization',
        id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
      },
      {
        name: '21:panel_21',
        type: 'visualization',
        id: '293b5a30-4c8f-11e8-b3d7-01146121b73d',
      },
      {
        name: '23:panel_23',
        type: 'visualization',
        id: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
      },
      {
        name: '31:panel_31',
        type: 'visualization',
        id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '392b4936-f753-47bc-a98d-a4e41a0a4cd4:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '392b4936-f753-47bc-a98d-a4e41a0a4cd4:indexpattern-datasource-layer-8fa993db-c147-4954-adf7-4ff264d42576',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '9271deff-5a61-4665-83fc-f9fdc6bf0c0b:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '9271deff-5a61-4665-83fc-f9fdc6bf0c0b:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'aa591c29-1a31-4ee1-a71d-b829c06fd162:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'aa591c29-1a31-4ee1-a71d-b829c06fd162:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'aa591c29-1a31-4ee1-a71d-b829c06fd162:filter-index-pattern-0',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'b766e3b8-4544-46ed-99e6-9ecc4847e2a2:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'b766e3b8-4544-46ed-99e6-9ecc4847e2a2:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '2e33ade5-96e5-40b4-b460-493e5d4fa834:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '2e33ade5-96e5-40b4-b460-493e5d4fa834:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '2e33ade5-96e5-40b4-b460-493e5d4fa834:filter-index-pattern-0',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '086ac2e9-dd16-4b45-92b8-1e43ff7e3f65:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '086ac2e9-dd16-4b45-92b8-1e43ff7e3f65:indexpattern-datasource-layer-03c34665-471c-49c7-acf1-5a11f517421c',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'fb86b32f-fb7a-45cf-9511-f366fef51bbd:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'fb86b32f-fb7a-45cf-9511-f366fef51bbd:indexpattern-datasource-layer-f26e8f7a-4118-4227-bea0-5c02d8b270f7',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '0cc42484-16f7-42ec-b38c-9bf8be69cde7:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '0cc42484-16f7-42ec-b38c-9bf8be69cde7:indexpattern-datasource-layer-e80cc05e-c52a-4e5f-ac71-4b37274867f5',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0:indexpattern-datasource-layer-0c8e136b-a822-4fb3-836d-e06cbea4eea4',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0:filter-index-pattern-0',
        type: 'index-pattern',
      },
      {
        name: 'controlGroup_85b632c8-3b7b-408d-8223-b0caccf75bd3:optionsListDataView',
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        name: 'controlGroup_d4dc9d2b-5850-402a-921d-8a2cd0107156:optionsListDataView',
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        name: 'controlGroup_bee4a16a-f5c1-40b2-887e-db1b9ad9e15f:rangeSliderDataView',
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
    ],
    migrationVersion: {
      dashboard: '8.5.0',
    },
    coreMigrationVersion: '8.6.0',
  },
];
