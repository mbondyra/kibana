/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tool UI event sent when an agent tool starts generating content for an existing custom content
 * panel, so the open panel can show its generating state until the run ends.
 */
export const CUSTOM_CONTENT_GENERATING_UI_EVENT = 'custom_content:generating';

export interface CustomContentGeneratingUiEventData {
  embeddable_id: string;
}
