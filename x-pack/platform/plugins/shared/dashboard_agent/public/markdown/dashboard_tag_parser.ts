/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTagParser } from '@kbn/onechat-plugin/public';
import { dashboardElement } from '@kbn/onechat-common/tools/tool_result';

export const dashboardTagParser = createTagParser({
  tagName: dashboardElement.tagName,
  getAttributes: (value, extractAttr) => ({
    toolResultId: extractAttr(value, dashboardElement.attributes.toolResultId),
  }),
  assignAttributes: (node, attributes) => {
    node.type = dashboardElement.tagName;
    node.toolResultId = attributes.toolResultId;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: dashboardElement.tagName,
    toolResultId: attributes.toolResultId,
    position,
  }),
});

