/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, type Subscription } from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { IdGenerator } from './dashboard_app_integration';

export interface NewAttachmentIdRegenerationSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  newAttachmentStableId: IdGenerator;
}

export const createNewAttachmentIdRegenerationSubscription = ({
  agentBuilder,
  newAttachmentStableId,
}: NewAttachmentIdRegenerationSubscriptionParams): Subscription =>
  agentBuilder.events.chat$.pipe(filter(isRoundCompleteEvent)).subscribe((event) => {
    if (event.data.attachments?.some(({ id }) => id === newAttachmentStableId.current)) {
      newAttachmentStableId.next();
    }
  });
