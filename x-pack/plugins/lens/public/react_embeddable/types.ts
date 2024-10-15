/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  AggregateQuery,
  ExecutionContextSearch,
  Filter,
  Query,
  TimeRange,
} from '@kbn/es-query';
import type { Adapters, InspectorOptions } from '@kbn/inspector-plugin/public';
import type {
  HasEditCapabilities,
  HasInPlaceLibraryTransforms,
  HasLibraryTransforms,
  HasSupportedTriggers,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesWritablePanelTitle,
  PublishingSubject,
  SerializedTitles,
  ViewMode,
} from '@kbn/presentation-publishing';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import type {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import type { PaletteOutput } from '@kbn/coloring';
import type { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import type {
  Capabilities,
  CoreStart,
  HttpSetup,
  IUiSettingsClient,
  KibanaExecutionContext,
  OverlayRef,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { TimefilterContract, FilterManager } from '@kbn/data-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type {
  ExpressionRendererEvent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import type { AllowedGaugeOverrides } from '@kbn/expression-gauge-plugin/common';
import type { AllowedPartitionOverrides } from '@kbn/expression-partition-vis-plugin/common';
import type { AllowedXYOverrides } from '@kbn/expression-xy-plugin/common';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { LegacyMetricState } from '../../common';
import type { LensDocument } from '../persistence';
import type { LensInspector } from '../lens_inspector_service';
import type { LensAttributesService } from '../lens_attribute_service';
import type {
  DatatableVisualizationState,
  DocumentToExpressionReturnType,
  HeatmapVisualizationState,
  XYState,
} from '../async_services';
import type {
  AddUserMessages,
  DatasourceMap,
  IndexPatternMap,
  IndexPatternRef,
  LensTableRowContextMenuEvent,
  Simplify,
  UserMessage,
  VisualizationMap,
} from '../types';
import type { LensPluginStartDependencies } from '../plugin';
import type { TableInspectorAdapter } from '../editor_frame_service/types';
import type { PieVisualizationState } from '../../common/types';
import type { FormBasedPersistedState } from '..';
import type { TextBasedPersistedState } from '../datasources/text_based/types';
import type { GaugeVisualizationState } from '../visualizations/gauge/constants';
import type { MetricVisualizationState } from '../visualizations/metric/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LensApiProps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LensStateProps {}

export type LensSavedObjectAttributes = Omit<LensDocument, 'savedObjectId' | 'type'>;

export interface VisualizationContext {
  doc: LensDocument | undefined;
  mergedSearchContext: ExecutionContextSearch;
  indexPatterns: IndexPatternMap;
  indexPatternRefs: IndexPatternRef[];
  activeVisualizationState: unknown;
  activeDatasourceState: unknown;
  activeData?: TableInspectorAdapter;
}

export interface VisualizationContextHelper {
  getVisualizationContext: () => VisualizationContext;
  updateVisualizationContext: (newContext: Partial<VisualizationContext>) => void;
}

export interface ViewUnderlyingDataArgs {
  dataViewSpec: DataViewSpec;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  columns: string[];
}

export type LensEmbeddableStartServices = Simplify<
  LensPluginStartDependencies & {
    timefilter: TimefilterContract;
    coreHttp: HttpSetup;
    coreStart: CoreStart;
    capabilities: RecursiveReadonly<Capabilities>;
    expressionRenderer: ReactExpressionRendererType;
    documentToExpression: (doc: LensDocument) => Promise<DocumentToExpressionReturnType>;
    injectFilterReferences: FilterManager['inject'];
    visualizationMap: VisualizationMap;
    datasourceMap: DatasourceMap;
    theme: ThemeServiceStart;
    uiSettings: IUiSettingsClient;
    attributeService: LensAttributesService;
  }
>;

export interface PreventableEvent {
  preventDefault(): void;
}

interface LensByValue {
  // by-value
  attributes?: Simplify<LensSavedObjectAttributes>;
}

export interface LensOverrides {
  /**
   * Overrides can tweak the style of the final embeddable and are executed at the end of the Lens rendering pipeline.
   * Each visualization type offers various type of overrides, per component (i.e. 'setting', 'axisX', 'partition', etc...)
   *
   * While it is not possible to pass function/callback/handlers to the renderer, it is possible to overwrite
   * the current behaviour by passing the "ignore" string to the override prop (i.e. onBrushEnd: "ignore" to stop brushing)
   */
  overrides?:
    | AllowedChartOverrides
    | AllowedSettingsOverrides
    | AllowedXYOverrides
    | AllowedPartitionOverrides
    | AllowedGaugeOverrides;
}

/**
 * Lens embeddable props broken down by type
 */

export interface LensByReference {
  // by-reference
  savedObjectId?: string;
}

export type LensPropsVariants = LensByValue & LensByReference;

export interface ViewInDiscoverCallbacks extends LensApiProps {
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs | undefined;
}

export interface IntegrationCallbacks extends LensApiProps {
  isTextBasedLanguage: () => boolean | undefined;
  getTextBasedLanguage: () => string | undefined;
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
  getFullAttributes: () => LensDocument | undefined;
  updateAttributes: (newAttributes: LensRuntimeState['attributes']) => void;
  updateSavedObjectId: (newSavedObjectId: LensRuntimeState['savedObjectId']) => void;
  updateOverrides: (newOverrides: LensOverrides['overrides']) => void;
}

export interface LensPublicCallbacks extends LensApiProps {
  onBrushEnd?: (data: Simplify<BrushTriggerEvent['data'] & PreventableEvent>) => void;
  onLoad?: (
    isLoading: boolean,
    adapters?: Partial<DefaultInspectorAdapters>,
    dataLoading$?: PublishingSubject<boolean | undefined>
  ) => void;
  onFilter?: (
    data: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
  ) => void;
  onTableRowClick?: (
    data: Simplify<LensTableRowContextMenuEvent['data'] & PreventableEvent>
  ) => void;
  /**
   * Let the consumer overwrite embeddable user messages
   */
  onBeforeBadgesRender?: (userMessages: UserMessage[]) => UserMessage[];
}

export type LensApiCallbacks = Simplify<ViewInDiscoverCallbacks & IntegrationCallbacks>;

export interface LensUnifiedSearchContext {
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  searchSessionId?: string;
  lastReloadRequestTime?: number;
}

export interface LensPanelProps {
  id?: string;
  renderMode?: ViewMode;
  disableTriggers?: boolean;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  palette?: PaletteOutput;
}

/**
 * This set of props are exposes by the Lens component too
 */
export interface LensSharedProps {
  executionContext?: KibanaExecutionContext;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
  viewMode?: ViewMode;
}

interface LensRequestHandlersProps {
  /**
   * Custom abort controller to be used for the ES client
   */
  abortController?: AbortController;
}

/**
 * Compose together all the props and make them inspectable via Simplify
 *
 * The LensSerializedState is the state stored for a dashboard panel
 * that contains:
 * * Lens document state
 * * Panel settings
 * * other props from the embeddable
 */
export type LensSerializedState = Simplify<
  LensPropsVariants &
    LensOverrides &
    LensUnifiedSearchContext &
    LensPanelProps &
    SerializedTitles &
    LensSharedProps &
    Partial<DynamicActionsSerializedState>
>;

/**
 * Custom props exposed on the Lens exported component
 */
export type LensComponentProps = Simplify<
  LensRequestHandlersProps &
    LensSharedProps &
    LensStateProps & {
      /**
       * When enabled the Lens component will render as a dashboard panel
       */
      withDefaultActions?: boolean;
      /**
       * Allow custom actions to be rendered in the panel
       */
      extraActions?: Action[];
      /**
       * Disable specific actions for the embeddable
       */
      disabledActions?: string[];
      /**
       * Toggles the inspector
       */
      showInspector?: boolean;
      /**
       * Toggle inline editing feature
       */
      canEditInline?: boolean;
    }
>;

/**
 * This is the subset of props that from the LensComponent will be forwarded to the Lens embeddable
 */
export type LensComponentForwardedProps = Pick<
  LensComponentProps,
  'style' | 'className' | 'noPadding' | 'abortController' | 'executionContext' | 'viewMode'
>;

/**
 * Carefully chosen props to expose on the Lens renderer component used by
 * other plugins
 */

type ComponentProps = LensComponentProps & LensPublicCallbacks;
type ComponentSerializedProps = TypedLensSerializedState;

type LensRendererPrivateProps = ComponentSerializedProps & ComponentProps;
export type LensRendererProps = Simplify<LensRendererPrivateProps>;

/**
 * The LensRuntimeState is the state stored for a dashboard panel
 * that contains:
 * * Lens document state
 * * Panel settings
 * * other props from the embeddable
 */
export type LensRuntimeState = Simplify<
  Omit<ComponentSerializedProps, 'attributes'> & {
    attributes: NonNullable<LensSerializedState['attributes']>;
  } & Pick<LensComponentForwardedProps, 'viewMode' | 'abortController' | 'executionContext'>
>;

export interface LensInspectorAdapters {
  getInspectorAdapters: () => Adapters;
  inspect: (options?: InspectorOptions) => OverlayRef;
  closeInspector: () => Promise<void>;
  // expose a handler for the inspector adapters
  // to be able to subscribe to changes
  // a typical use case is the inline editing, where the editor
  // needs to be updated on data changes
  adapters$: PublishingSubject<Adapters>;
}

export type LensApi = Simplify<
  DefaultEmbeddableApi<LensSerializedState, LensRuntimeState> &
    // This is used by actions to operate the edit action
    HasEditCapabilities &
    // This is used by dashboard/container to show filters/queries on the panel
    PublishesUnifiedSearch &
    // Let the container know the loading state
    PublishesDataLoading &
    // Let the container know the used data views
    PublishesDataViews &
    // Let the container operate on panel title/description
    PublishesWritablePanelTitle &
    PublishesWritablePanelDescription &
    // This embeddable can narrow down specific triggers usage
    HasSupportedTriggers &
    // Offers methods to operate from/on the linked saved object
    HasInPlaceLibraryTransforms &
    HasLibraryTransforms<LensRuntimeState> &
    // Let the container know the saved object id
    PublishesSavedObjectId &
    // Lens specific API methods:
    // Let the container know when the data has been loaded/updated
    LensInspectorAdapters &
    LensRequestHandlersProps &
    LensApiCallbacks
>;

// This is an API only used internally to the embeddable but not exported elsewhere
// there's some overlapping between this and the LensApi but they are shared references
export type LensInternalApi = Simplify<
  Pick<IntegrationCallbacks, 'updateAttributes' | 'updateOverrides'> &
    PublishesDataViews & {
      attributes$: PublishingSubject<LensRuntimeState['attributes']>;
      overrides$: PublishingSubject<LensOverrides['overrides']>;
      disableTriggers$: PublishingSubject<LensPanelProps['disableTriggers']>;
      dataLoading$: PublishingSubject<boolean | undefined>;
      hasRenderCompleted$: PublishingSubject<boolean>;
      dispatchRenderStart: () => void;
      dispatchRenderComplete: () => void;
      updateRenderCount: () => void;
      updateDataLoading: (newDataLoading: boolean | undefined) => void;
      expressionParams$: PublishingSubject<Partial<ExpressionWrapperProps>>;
      updateExpressionParams: (newParams: Partial<ExpressionWrapperProps>) => void;
      expressionAbortController$: PublishingSubject<AbortController | undefined>;
      updateAbortController: (newAbortController: AbortController | undefined) => void;
      renderCount$: PublishingSubject<number>;
      updateDataViews: (dataViews: DataView[] | undefined) => void;
      messages$: PublishingSubject<UserMessage[]>;
      blockingMessages$: PublishingSubject<UserMessage[]>;
      updateMessages: (newMessages: UserMessage[]) => void;
      updateBlockingMessages: (newMessages: UserMessage[]) => void;
      resetAllMessages: () => void;
    }
>;

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  variables?: Record<string, unknown>;
  interactive?: boolean;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData$: (
    data: unknown,
    inspectorAdapters?: Partial<DefaultInspectorAdapters> | undefined
  ) => void;
  onRender$: () => void;
  renderMode?: RenderMode;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  hasCompatibleActions?: ReactExpressionRendererProps['hasCompatibleActions'];
  getCompatibleCellValueActions?: ReactExpressionRendererProps['getCompatibleCellValueActions'];
  style?: React.CSSProperties;
  className?: string;
  addUserMessages: AddUserMessages;
  onRuntimeError: (error: Error) => void;
  executionContext?: KibanaExecutionContext;
  lensInspector: LensInspector;
  noPadding?: boolean;
  abortController?: AbortController;
}

export type GetStateType = () => LensRuntimeState;

/**
 * Custom Lens component exported by the plugin
 * For better DX of Lens component consumers, expose a typed version of the serialized state
 */

/** Utility function to build typed version for each chart */
type TypedLensAttributes<TVisType, TVisState> = Simplify<
  Omit<LensDocument, 'savedObjectId' | 'type' | 'state' | 'visualizationType'> & {
    visualizationType: TVisType;
    state: Simplify<
      Omit<LensDocument['state'], 'datasourceStates' | 'visualization'> & {
        datasourceStates: {
          formBased?: FormBasedPersistedState;
          textBased?: TextBasedPersistedState;
        };
        visualization: TVisState;
      }
    >;
  }
>;

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensSerializedState = Simplify<
  Omit<LensSerializedState, 'attributes'> & {
    attributes:
      | TypedLensAttributes<'lnsXY', XYState>
      | TypedLensAttributes<'lnsPie', PieVisualizationState>
      | TypedLensAttributes<'lnsHeatmap', HeatmapVisualizationState>
      | TypedLensAttributes<'lnsGauge', GaugeVisualizationState>
      | TypedLensAttributes<'lnsDatatable', DatatableVisualizationState>
      | TypedLensAttributes<'lnsLegacyMetric', LegacyMetricState>
      | TypedLensAttributes<'lnsMetric', MetricVisualizationState>
      | TypedLensAttributes<string, unknown>;
  }
>;

/**
 * Backward compatibility types
 */
export type LensByValueInput = Omit<LensRendererPrivateProps, 'savedObjectId'>;
export type LensByReferenceInput = Omit<LensRendererPrivateProps, 'attributes'>;
export type TypedLensByValueInput = Omit<LensRendererProps, 'savedObjectId'>;
export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;
export type LensEmbeddableOutput = LensApi;
