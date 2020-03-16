/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function({ readConfigFile }) {
  const chromeConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...chromeConfig.getAll(),

    suiteTags: {
      exclude: ['skipCoverage'],
    },

    junit: {
      reportName: 'Code Coverage for Functional Tests',
    },
  };
}
