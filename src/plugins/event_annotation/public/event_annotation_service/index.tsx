/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationGroupConfig } from '../../common';
import { EventAnnotationServiceType } from './types';

export class EventAnnotationService {
  private eventAnnotationService?: EventAnnotationServiceType;
  public async getService() {
    if (!this.eventAnnotationService) {
      const { getEventAnnotationService } = await import('./service');
      this.eventAnnotationService = getEventAnnotationService();
    }
    return this.eventAnnotationService;
  }
  public async loadAnnotationGroup(groupId: string): Promise<EventAnnotationGroupConfig> {
    return {} as EventAnnotationGroupConfig;
  }
  public async deleteAnnotationGroups(groupIds: string[]): Promise<void> {}
  public async createAnnotationGroup(group: EventAnnotationGroupConfig): Promise<{ id: string }> {
    return { id: '' };
  }
  public async updateAnnotationGroup(group: EventAnnotationGroupConfig): Promise<void> {}
}
