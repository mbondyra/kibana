/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WiredStreamConfigDefinition, WiredStreamDefinition } from '@kbn/streams-schema';
import { FtrProviderContext } from '../../ftr_provider_context';
import { cleanUpRootStream } from './helpers/cleanup';
import { enableStreams, putStream } from './helpers/requests';

const rootStreamDefinition: WiredStreamDefinition = {
  name: 'logs',
  stream: {
    ingest: {
      processing: [],
      routing: [],
      wired: {
        fields: {
          '@timestamp': {
            type: 'date',
          },
          message: {
            type: 'match_only_text',
          },
          'host.name': {
            type: 'keyword',
          },
          'log.level': {
            type: 'keyword',
          },
        },
      },
    },
  },
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');

  describe('Root stream', () => {
    before(async () => {
      await enableStreams(supertest);
    });

    after(async () => {
      await cleanUpRootStream(esClient);
    });

    it('Should not allow processing changes', async () => {
      const body: WiredStreamConfigDefinition = {
        ingest: {
          ...rootStreamDefinition.stream.ingest,
          processing: [
            {
              config: {
                grok: {
                  field: 'message',
                  patterns: [
                    '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                  ],
                },
              },
            },
          ],
        },
      };
      const response = await putStream(supertest, 'logs', body, 400);
      expect(response).to.have.property(
        'message',
        'Root stream processing rules cannot be changed'
      );
    });

    it('Should not allow fields changes', async () => {
      const body: WiredStreamConfigDefinition = {
        ingest: {
          ...rootStreamDefinition.stream.ingest,
          wired: {
            fields: {
              ...rootStreamDefinition.stream.ingest.wired.fields,
              'log.level': {
                type: 'boolean',
              },
            },
          },
        },
      };
      const response = await putStream(supertest, 'logs', body, 400);
      expect(response).to.have.property('message', 'Root stream fields cannot be changed');
    });

    it('Should allow routing changes', async () => {
      const body: WiredStreamConfigDefinition = {
        ingest: {
          ...rootStreamDefinition.stream.ingest,
          routing: [
            {
              name: 'logs.gcpcloud',
              condition: {
                field: 'cloud.provider',
                operator: 'eq',
                value: 'gcp',
              },
            },
          ],
        },
      };
      const response = await putStream(supertest, 'logs', body);
      expect(response).to.have.property('acknowledged', true);
    });
  });
}
