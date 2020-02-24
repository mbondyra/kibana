
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import deepEqual from 'fast-deep-equal';

const logRerenderInit = () => {
  const trackedComponents = {};
  return componentTitle => {
    if (!trackedComponents[componentTitle]) {
      trackedComponents[componentTitle] = 0;
    }
    // eslint-disable-next-line
    console.log(`${componentTitle} rerendered ${++trackedComponents[componentTitle]} time`);
  };
};

export const logRerender = logRerenderInit();

export const logPropChangesInit = () => {
  const trackedComponents = {};

  const compareKeys = (prevProps, props) => {
    for (const x in prevProps) {
      if (prevProps[x] !== props[x]) {
        if (deepEqual(prevProps[x], props[x])) {
          // eslint-disable-next-line
            console.log(`prop change ${x} is redundant`, props[x], prevProps[x]);
        } else {
          // eslint-disable-next-line
            console.log(`prop change ${x} has different props`, prevProps[x], props[x]);
        }
      }
    }
  };

  return (componentTitle, newProps) => {
    if (!trackedComponents[componentTitle]) {
      trackedComponents[componentTitle] = [];
    }
    const length = trackedComponents[componentTitle].length;
    if (length > 0) {
      compareKeys(trackedComponents[componentTitle][length - 1], newProps);
    } else {
      // eslint-disable-next-line
      console.log(`initial props`, newProps);
    }
    trackedComponents[componentTitle].push(newProps);
  };
};

export const logPropChanges = logPropChangesInit();