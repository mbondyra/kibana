/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { BehaviorSubject } from 'rxjs';
import type { LensRuntimeState } from '../../../react_embeddable/types';
// import type { EmbeddableOutput } from '@kbn/embeddable-plugin/public';
// import type { Observable } from 'rxjs';
// import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';

export interface LensChartLoadEvent {
  /**
   * Inspector adapters for the request
   */
  adapters: Partial<DefaultInspectorAdapters>;
  /**
   * Observable of the lens embeddable output
   */
  renderComplete$: BehaviorSubject<boolean>;
}

export interface InlineEditLensEmbeddableContext {
  // attributes of the Lens embeddable
  attributes: LensRuntimeState['attributes'];
  // chart event, can be fetched from the onLoad embeddable callback
  lensEvent: LensChartLoadEvent;
  // callback which runs every time something changes in the dimension panel
  onUpdate: (newAttributes: LensRuntimeState['attributes']) => void;
  // optional onApply callback
  onApply?: (newAttributes: LensRuntimeState['attributes']) => void;
  // optional onCancel callback
  onCancel?: () => void;
  // custom container element, use in case you need to render outside a flyout
  // in that case, the styling is responsibility of the consumer
  container?: HTMLElement | null;
}
