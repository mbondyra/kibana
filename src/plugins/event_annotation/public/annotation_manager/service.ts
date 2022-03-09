/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionsSetup } from '../../../expressions/public';
import { EventAnnotationPluginSetup } from '../';
import { AnnotationManager } from '.';

export interface AnnotationSetupPlugins {
  expressions: ExpressionsSetup;
  charts: EventAnnotationPluginSetup;
}

export class EventAnnotationService {
  private annotationManager!: AnnotationManager;
  constructor() {}

  public setup() {
    this.annotationManager = new AnnotationManager();
    return this.annotationManager;
  }

  public start() {
    return {
      annotationManager: this.annotationManager,
    };
  }
}
