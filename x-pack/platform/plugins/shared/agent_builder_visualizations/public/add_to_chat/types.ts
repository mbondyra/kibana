/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

export interface AddToChatResult {
  attachmentTypes: readonly string[];
}

/** Decides what "Add to chat" sends for the panels it handles. */
export interface AddToChatProvider {
  /** Reported as the event pathway. */
  id: string;
  isCompatible: (embeddable: unknown) => boolean | Promise<boolean>;
  getCompatibilityChangesSubject?: (embeddable: unknown) => Observable<undefined> | undefined;
  /** Returns undefined when nothing was added. */
  execute: (embeddable: unknown) => Promise<AddToChatResult | undefined>;
}

export interface AddToChatProviderRegistry {
  register: (provider: AddToChatProvider) => void;
  getAll: () => readonly AddToChatProvider[];
}
