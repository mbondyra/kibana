/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import { toExpression } from '@kbn/interpreter';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart, ExecutionContextSearch } from '@kbn/data-plugin/public';
import type {
  ExpressionRendererEvent,
  ExpressionRenderError,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { DropIllustration } from '@kbn/chart-icons';
import { DragDrop, useDragDropContext, DragDropIdentifier } from '@kbn/dom-drag-drop';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { trackUiCounterEvents } from '../../../lens_ui_telemetry';
import { getSearchWarningMessages } from '../../../utils';
import {
  FramePublicAPI,
  isLensBrushEvent,
  isLensFilterEvent,
  isLensMultiFilterEvent,
  isLensEditEvent,
  VisualizationMap,
  DatasourceMap,
  Suggestion,
  DatasourceLayers,
  UserMessage,
  UserMessagesGetter,
  AddUserMessages,
  isMessageRemovable,
} from '../../../types';
import { switchToSuggestion } from '../suggestion_helpers';
import { buildExpression } from '../expression_helpers';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import applyChangesIllustrationDark from '../../../assets/render_dark@2x.png';
import applyChangesIllustrationLight from '../../../assets/render_light@2x.png';
import { getOriginalRequestErrorMessages } from '../../error_helper';
import {
  onActiveDataChange,
  useLensDispatch,
  editVisualizationAction,
  setSaveable,
  useLensSelector,
  selectExecutionContext,
  selectIsFullscreenDatasource,
  selectVisualization,
  selectDatasourceStates,
  selectActiveDatasourceId,
  selectSearchSessionId,
  selectAutoApplyEnabled,
  selectTriggerApplyChanges,
  selectDatasourceLayers,
  applyChanges,
  selectChangesApplied,
  VisualizationState,
  DatasourceStates,
  DataViewsState,
} from '../../../state_management';
import type { LensInspector } from '../../../lens_inspector_service';
import { inferTimeField, DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../utils';
import { setChangesApplied } from '../../../state_management/lens_slice';

export interface WorkspacePanelProps {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  framePublicAPI: FramePublicAPI;
  ExpressionRenderer: ReactExpressionRendererType;
  core: CoreStart;
  plugins: { uiActions?: UiActionsStart; data: DataPublicPluginStart };
  getSuggestionForField: (field: DragDropIdentifier) => Suggestion | undefined;
  lensInspector: LensInspector;
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
}

interface WorkspaceState {
  expandError: boolean;
  expressionToRender: string | null | undefined;
  errors: UserMessage[];
}

const staticDropProps = {
  value: {
    id: 'lnsWorkspace',
    humanData: {
      label: i18n.translate('xpack.lens.editorFrame.workspaceLabel', {
        defaultMessage: 'Workspace',
      }),
    },
  },
  order: [1, 0, 0, 0],
  dataTestSubj: 'lnsWorkspace',
  draggable: false,
};

const executionContext: KibanaExecutionContext = {
  type: 'application',
  child: {
    type: 'lens',
  },
};

const EXPRESSION_BUILD_ERROR_ID = 'expression_build_error';

// Exported for testing purposes only.
export const WorkspacePanel = ({
  framePublicAPI,
  visualizationMap,
  datasourceMap,
  core,
  plugins,
  ExpressionRenderer: ExpressionRendererComponent,
  getSuggestionForField,
  lensInspector,
  getUserMessages,
  addUserMessages,
}: WorkspacePanelProps) => {
  const dispatchLens = useLensDispatch();
  const isFullscreen = useLensSelector(selectIsFullscreenDatasource);
  const visualization = useLensSelector(selectVisualization);
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const autoApplyEnabled = useLensSelector(selectAutoApplyEnabled);
  const changesApplied = useLensSelector(selectChangesApplied);
  const triggerApply = useLensSelector(selectTriggerApplyChanges);
  const datasourceLayers = useLensSelector((state) => selectDatasourceLayers(state, datasourceMap));
  const searchSessionId = useLensSelector(selectSearchSessionId);

  const [localState, setLocalState] = useState<WorkspaceState>({
    expandError: false,
    expressionToRender: undefined,
    errors: [],
  });

  const initialVisualizationRenderComplete = useRef<boolean>(false);

  // NOTE: This does not reflect the actual visualization render
  const initialWorkspaceRenderComplete = useRef<boolean>();

  const [{ dragging }] = useDragDropContext();


  const renderDeps = useRef<{
    datasourceMap: DatasourceMap;
    datasourceStates: DatasourceStates;
    visualization: VisualizationState;
    visualizationMap: VisualizationMap;
    datasourceLayers: DatasourceLayers;
    dataViews: DataViewsState;
  }>();

  const { dataViews } = framePublicAPI;

  renderDeps.current = {
    datasourceMap,
    datasourceStates,
    visualization,
    visualizationMap,
    datasourceLayers,
    dataViews,
  };

  // NOTE: initialRenderTime is only set once when the component mounts
  const visualizationRenderStartTime = useRef<number>(NaN);
  const dataReceivedTime = useRef<number>(NaN);

  const onRender$ = useCallback(() => {
    if (renderDeps.current) {
      if (!initialVisualizationRenderComplete.current) {
        initialVisualizationRenderComplete.current = true;
        // NOTE: this metric is only reported for an initial editor load of a pre-existing visualization
        const currentTime = performance.now();
        reportPerformanceMetricEvent(core.analytics, {
          eventName: 'lensVisualizationRenderTime',
          duration: currentTime - visualizationRenderStartTime.current,
          key1: 'time_to_data',
          value1: dataReceivedTime.current - visualizationRenderStartTime.current,
          key2: 'time_to_render',
          value2: currentTime - dataReceivedTime.current,
        });
      }
      const datasourceEvents = Object.values(renderDeps.current.datasourceMap).reduce<string[]>(
        (acc, datasource) => {
          if (!renderDeps.current!.datasourceStates[datasource.id]) return [];
          return [
            ...acc,
            ...(datasource.getRenderEventCounters?.(
              renderDeps.current!.datasourceStates[datasource.id]?.state
            ) ?? []),
          ];
        },
        []
      );
      let visualizationEvents: string[] = [];
      if (renderDeps.current.visualization.activeId) {
        visualizationEvents =
          renderDeps.current.visualizationMap[
            renderDeps.current.visualization.activeId
          ].getRenderEventCounters?.(renderDeps.current.visualization.state) ?? [];
      }
      const events = ['vis_editor', ...datasourceEvents, ...visualizationEvents];

      const adHocDataViews = Object.values(renderDeps.current.dataViews.indexPatterns || {}).filter(
        (indexPattern) => !indexPattern.isPersisted
      );
      adHocDataViews.forEach(() => {
        events.push('ad_hoc_data_view');
      });

      trackUiCounterEvents(events);
    }
  }, [core.analytics]);

  const removeSearchWarningMessagesRef = useRef<() => void>();
  const removeExpressionBuildErrorsRef = useRef<() => void>();

  const onData$ = useCallback(
    (_data: unknown, adapters?: Partial<DefaultInspectorAdapters>) => {
      if (renderDeps.current) {
        dataReceivedTime.current = performance.now();

        const [defaultLayerId] = Object.keys(renderDeps.current.datasourceLayers);
        const datasource = Object.values(renderDeps.current.datasourceMap)[0];
        const datasourceState = Object.values(renderDeps.current.datasourceStates)[0].state;

        let requestWarnings: UserMessage[] = [];

        if (adapters?.requests) {
          requestWarnings = getSearchWarningMessages(
            adapters.requests,
            datasource,
            datasourceState,
            {
              searchService: plugins.data.search,
            }
          );
        }

        if (requestWarnings.length) {
          removeSearchWarningMessagesRef.current = addUserMessages(
            requestWarnings.filter(isMessageRemovable)
          );
        } else if (removeSearchWarningMessagesRef.current) {
          removeSearchWarningMessagesRef.current();
          removeSearchWarningMessagesRef.current = undefined;
        }

        if (adapters && adapters.tables) {
          dispatchLens(
            onActiveDataChange({
              activeData: Object.entries(adapters.tables?.tables).reduce<Record<string, Datatable>>(
                (acc, [key, value], _index, tables) => ({
                  ...acc,
                  [tables.length === 1 ? defaultLayerId : key]: value,
                }),
                {}
              ),
            })
          );
        }
      }
    },
    [addUserMessages, dispatchLens, plugins.data.search]
  );

  const shouldApplyExpression =
    autoApplyEnabled || !initialWorkspaceRenderComplete.current || triggerApply;
  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : null;

  const workspaceErrors = useCallback(() => {
    return getUserMessages(['visualization', 'visualizationInEditor'], {
      severity: 'error',
    });
  }, [getUserMessages]);

  // if the expression is undefined, it means we hit an error that should be displayed to the user
  const unappliedExpression = useMemo(() => {
    // shouldn't build expression if there is any type of error other than an expression build error
    // (in which case we try again every time because the config might have changed)
    if (workspaceErrors().every((error) => error.uniqueId === EXPRESSION_BUILD_ERROR_ID)) {
      try {
        const ast = buildExpression({
          visualization: activeVisualization,
          visualizationState: visualization.state,
          datasourceMap,
          datasourceStates,
          datasourceLayers,
          indexPatterns: dataViews.indexPatterns,
          dateRange: framePublicAPI.dateRange,
          nowInstant: plugins.data.nowProvider.get(),
          searchSessionId,
        });

        if (ast) {
          // expression has to be turned into a string for dirty checking - if the ast is rebuilt,
          // turning it into a string will make sure the expression renderer only re-renders if the
          // expression actually changed.
          return toExpression(ast);
        } else {
          return null;
        }
      } catch (e) {
        removeExpressionBuildErrorsRef.current = addUserMessages([
          {
            uniqueId: EXPRESSION_BUILD_ERROR_ID,
            severity: 'error',
            fixableInEditor: true,
            displayLocations: [{ id: 'visualization' }],
            shortMessage: i18n.translate('xpack.lens.editorFrame.buildExpressionError', {
              defaultMessage: 'An unexpected error occurred while preparing the chart',
            }),
            longMessage: (
              <>
                <p data-test-subj="expression-failure">
                  <FormattedMessage
                    id="xpack.lens.editorFrame.expressionFailure"
                    defaultMessage="An error occurred in the expression"
                  />
                </p>

                <p>{e.toString()}</p>
              </>
            ),
          },
        ]);
      }
    }
  }, [
    workspaceErrors,
    activeVisualization,
    visualization.state,
    datasourceMap,
    datasourceStates,
    datasourceLayers,
    dataViews.indexPatterns,
    framePublicAPI.dateRange,
    plugins.data.nowProvider,
    searchSessionId,
    addUserMessages,
  ]);

  const isSaveable = Boolean(unappliedExpression);

  useEffect(() => {
    dispatchLens(setSaveable(isSaveable));
  }, [isSaveable, dispatchLens]);

  useEffect(() => {
    if (!autoApplyEnabled) {
      dispatchLens(setChangesApplied(unappliedExpression === localState.expressionToRender));
    }
  });

  useEffect(() => {
    if (shouldApplyExpression) {
      setLocalState((s) => ({
        ...s,
        expressionToRender: unappliedExpression,
        errors: workspaceErrors(),
      }));
    }
  }, [unappliedExpression, shouldApplyExpression, workspaceErrors]);

  const expressionExists = Boolean(localState.expressionToRender);

  useEffect(() => {
    // reset expression error if component attempts to run it again
    if (expressionExists && removeExpressionBuildErrorsRef.current) {
      removeExpressionBuildErrorsRef.current();
      removeExpressionBuildErrorsRef.current = undefined;
    }
  }, [expressionExists]);

  useEffect(() => {
    // null signals an empty workspace which should count as an initial render
    if (
      (expressionExists || localState.expressionToRender === null) &&
      !initialWorkspaceRenderComplete.current
    ) {
      initialWorkspaceRenderComplete.current = true;
    }
  }, [expressionExists, localState.expressionToRender]);

  const onEvent = useCallback(
    (event: ExpressionRendererEvent) => {
      if (!plugins.uiActions) {
        // ui actions not available, not handling event...
        return;
      }
      if (isLensBrushEvent(event)) {
        plugins.uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: {
            ...event.data,
            timeFieldName: inferTimeField(plugins.data.datatableUtilities, event),
          },
        });
      }
      if (isLensFilterEvent(event) || isLensMultiFilterEvent(event)) {
        plugins.uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: {
            ...event.data,
            timeFieldName: inferTimeField(plugins.data.datatableUtilities, event),
          },
        });
      }
      if (isLensEditEvent(event) && activeVisualization?.onEditAction) {
        dispatchLens(
          editVisualizationAction({
            visualizationId: activeVisualization.id,
            event,
          })
        );
      }
    },
    [plugins.data.datatableUtilities, plugins.uiActions, activeVisualization, dispatchLens]
  );

  const hasCompatibleActions = useCallback(
    async (event: ExpressionRendererEvent) => {
      if (!plugins.uiActions) {
        // ui actions not available, not handling event...
        return false;
      }
      if (!isLensFilterEvent(event) && !isLensMultiFilterEvent(event)) {
        return false;
      }
      return (
        (
          await plugins.uiActions.getTriggerCompatibleActions(
            VIS_EVENT_TO_TRIGGER[event.name],
            event
          )
        ).length > 0
      );
    },
    [plugins.uiActions]
  );

  const onDrop = useCallback(
    (draggedItem) => {
      const suggestionForDraggedField = getSuggestionForField(draggedItem);
      if (suggestionForDraggedField) {
        trackUiCounterEvents('drop_onto_workspace');
        switchToSuggestion(dispatchLens, suggestionForDraggedField, { clearStagedPreview: true });
      }
    },
    [dispatchLens, getSuggestionForField]
  );

  const IS_DARK_THEME: boolean = useObservable(core.theme.theme$, { darkMode: false }).darkMode;

  const renderDragDropPrompt = () => {
    return (
      <EuiText
        className={classNames('lnsWorkspacePanel__emptyContent')}
        textAlign="center"
        data-test-subj="workspace-drag-drop-prompt"
        size="s"
      >
        <div>
          <DropIllustration
            aria-hidden={true}
            className={classNames(
              'lnsWorkspacePanel__promptIllustration',
              'lnsWorkspacePanel__dropIllustration'
            )}
          />
          <h2>
            <strong>
              {!expressionExists
                ? i18n.translate('xpack.lens.editorFrame.emptyWorkspace', {
                    defaultMessage: 'Drop some fields here to start',
                  })
                : i18n.translate('xpack.lens.editorFrame.emptyWorkspaceSimple', {
                    defaultMessage: 'Drop field here',
                  })}
            </strong>
          </h2>
          {!expressionExists && (
            <>
              <EuiTextColor color="subdued" component="div">
                <p>
                  {i18n.translate('xpack.lens.editorFrame.emptyWorkspaceHeading', {
                    defaultMessage: 'Lens is the recommended editor for creating visualizations',
                  })}
                </p>
              </EuiTextColor>
              <p className="lnsWorkspacePanel__actions">
                <EuiLink
                  href="https://www.elastic.co/products/kibana/feedback"
                  target="_blank"
                  external
                >
                  {i18n.translate('xpack.lens.editorFrame.goToForums', {
                    defaultMessage: 'Make requests and give feedback',
                  })}
                </EuiLink>
              </p>
            </>
          )}
        </div>
      </EuiText>
    );
  };

  const renderApplyChangesPrompt = () => {
    const applyChangesString = i18n.translate('xpack.lens.editorFrame.applyChanges', {
      defaultMessage: 'Apply changes',
    });

    return (
      <EuiText
        className={classNames('lnsWorkspacePanel__emptyContent')}
        textAlign="center"
        data-test-subj="workspace-apply-changes-prompt"
        size="s"
      >
        <div>
          <img
            aria-hidden={true}
            src={IS_DARK_THEME ? applyChangesIllustrationDark : applyChangesIllustrationLight}
            alt={applyChangesString}
            className="lnsWorkspacePanel__promptIllustration"
          />
          <h2>
            <strong>
              {i18n.translate('xpack.lens.editorFrame.applyChangesWorkspacePrompt', {
                defaultMessage: 'Apply changes to render visualization',
              })}
            </strong>
          </h2>
          <p className="lnsWorkspacePanel__actions">
            <EuiButtonEmpty
              size="s"
              className={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
              iconType="checkInCircleFilled"
              onClick={() => dispatchLens(applyChanges())}
              data-test-subj="lnsApplyChanges__workspace"
            >
              {applyChangesString}
            </EuiButtonEmpty>
          </p>
        </div>
      </EuiText>
    );
  };

  const renderVisualization = () => {
    return (
      <VisualizationWrapper
        expression={localState.expressionToRender}
        lensInspector={lensInspector}
        onEvent={onEvent}
        hasCompatibleActions={hasCompatibleActions}
        setLocalState={setLocalState}
        localState={{ ...localState }}
        errors={localState.errors}
        ExpressionRendererComponent={ExpressionRendererComponent}
        core={core}
        onRender$={onRender$}
        onData$={onData$}
        onComponentRendered={() => {
          visualizationRenderStartTime.current = performance.now();
        }}
      />
    );
  };

  const renderWorkspace = () => {
    const customWorkspaceRenderer =
      activeDatasourceId &&
      datasourceMap[activeDatasourceId]?.getCustomWorkspaceRenderer &&
      dragging
        ? datasourceMap[activeDatasourceId].getCustomWorkspaceRenderer!(
            datasourceStates[activeDatasourceId].state,
            dragging,
            dataViews.indexPatterns
          )
        : undefined;

    if (customWorkspaceRenderer) {
      return customWorkspaceRenderer();
    }

    const hasSomethingToRender = localState.expressionToRender !== null;

    const renderWorkspaceContents = hasSomethingToRender
      ? renderVisualization
      : !changesApplied
      ? renderApplyChangesPrompt
      : renderDragDropPrompt;

    return (
      <DragDrop
        {...staticDropProps}
        className={classNames('lnsWorkspacePanel__dragDrop', {
          'lnsWorkspacePanel__dragDrop--fullscreen': isFullscreen,
        })}
        dropTypes={getSuggestionForField(dragging) ? ['field_add'] : undefined}
        onDrop={onDrop}
      >
        <div className="lnsWorkspacePanelWrapper__pageContentBody">{renderWorkspaceContents()}</div>
      </DragDrop>
    );
  };

  return (
    <WorkspacePanelWrapper
      framePublicAPI={framePublicAPI}
      visualizationState={visualization.state}
      visualizationId={visualization.activeId}
      datasourceStates={datasourceStates}
      datasourceMap={datasourceMap}
      visualizationMap={visualizationMap}
      isFullscreen={isFullscreen}
      lensInspector={lensInspector}
      getUserMessages={getUserMessages}
    >
      {renderWorkspace()}
    </WorkspacePanelWrapper>
  );
};

function useReportingState(errors: UserMessage[]): {
  isRenderComplete: boolean;
  hasDynamicError: boolean;
  setIsRenderComplete: (state: boolean) => void;
  setDynamicError: (state: boolean) => void;
  nodeRef: React.RefObject<HTMLDivElement>;
} {
  const [isRenderComplete, setIsRenderComplete] = useState(Boolean(errors?.length));
  const [hasDynamicError, setDynamicError] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenderComplete && nodeRef.current) {
      nodeRef.current.dispatchEvent(new CustomEvent('renderComplete', { bubbles: true }));
    }
  }, [isRenderComplete, errors]);

  return { isRenderComplete, setIsRenderComplete, hasDynamicError, setDynamicError, nodeRef };
}

export const VisualizationWrapper = ({
  expression,
  lensInspector,
  onEvent,
  hasCompatibleActions,
  setLocalState,
  localState,
  errors,
  ExpressionRendererComponent,
  core,
  onRender$,
  onData$,
  onComponentRendered,
}: {
  expression: string | null | undefined;
  lensInspector: LensInspector;
  onEvent: (event: ExpressionRendererEvent) => void;
  hasCompatibleActions: (event: ExpressionRendererEvent) => Promise<boolean>;
  setLocalState: (dispatch: (prevState: WorkspaceState) => WorkspaceState) => void;
  localState: WorkspaceState;
  errors: UserMessage[];
  ExpressionRendererComponent: ReactExpressionRendererType;
  core: CoreStart;
  onRender$: () => void;
  onData$: (data: unknown, adapters?: Partial<DefaultInspectorAdapters>) => void;
  onComponentRendered: () => void;
}) => {
  useEffect(() => {
    onComponentRendered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const context = useLensSelector(selectExecutionContext);
  // Used for reporting
  const { isRenderComplete, hasDynamicError, setIsRenderComplete, setDynamicError, nodeRef } =
    useReportingState(errors);

  const onRenderHandler = useCallback(() => {
    setIsRenderComplete(true);
    onRender$();
  }, [setIsRenderComplete, onRender$]);

  const searchContext: ExecutionContextSearch = useMemo(
    () => ({
      query: context.query,
      timeRange: {
        from: context.dateRange.fromDate,
        to: context.dateRange.toDate,
      },
      filters: context.filters,
      disableWarningToasts: true,
    }),
    [context]
  );
  const searchSessionId = useLensSelector(selectSearchSessionId);

  if (errors.length) {
    const showExtraErrorsAction =
      !localState.expandError && errors.length > 1 ? (
        <EuiButtonEmpty
          onClick={() => {
            setLocalState((prevState: WorkspaceState) => ({
              ...prevState,
              expandError: !prevState.expandError,
            }));
          }}
          data-test-subj="workspace-more-errors-button"
        >
          {i18n.translate('xpack.lens.editorFrame.configurationFailureMoreErrors', {
            defaultMessage: ` +{errors} {errors, plural, one {error} other {errors}}`,
            values: { errors: errors.length - 1 },
          })}
        </EuiButtonEmpty>
      ) : null;

    const [firstMessage, ...rest] = errors;

    return (
      <EuiFlexGroup
        data-shared-items-container
        data-render-complete={true}
        data-shared-item=""
        data-render-error={i18n.translate('xpack.lens.editorFrame.configurationFailureErrors', {
          defaultMessage: `A configuration error occurred`,
        })}
      >
        <EuiFlexItem>
          <EuiEmptyPrompt
            actions={showExtraErrorsAction}
            body={
              <>
                <div data-test-subj="workspace-error-message">{firstMessage.longMessage}</div>
                {localState.expandError && (
                  <>
                    <EuiSpacer />
                    {rest.map((message) => (
                      <div data-test-subj="workspace-error-message">
                        {message.longMessage}
                        <EuiSpacer />
                      </div>
                    ))}
                  </>
                )}
              </>
            }
            iconColor="danger"
            iconType="warning"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <div
      className="lnsExpressionRenderer"
      data-shared-items-container
      data-render-complete={isRenderComplete}
      data-shared-item=""
      data-render-error={
        hasDynamicError
          ? i18n.translate('xpack.lens.editorFrame.dataFailure', {
              defaultMessage: `An error occurred when loading data.`,
            })
          : undefined
      }
      ref={nodeRef}
    >
      <ExpressionRendererComponent
        className="lnsExpressionRenderer__component"
        padding="m"
        expression={expression!}
        searchContext={searchContext}
        searchSessionId={searchSessionId}
        onEvent={onEvent}
        hasCompatibleActions={hasCompatibleActions}
        onData$={onData$}
        onRender$={onRenderHandler}
        inspectorAdapters={lensInspector.adapters}
        executionContext={executionContext}
        renderMode="edit"
        renderError={(errorMessage?: string | null, error?: ExpressionRenderError | null) => {
          const errorsFromRequest = getOriginalRequestErrorMessages(error || null, core.docLinks);
          const visibleErrorMessages = errorsFromRequest.length
            ? errorsFromRequest.map((e) => e.longMessage || e.shortMessage)
            : errorMessage
            ? [errorMessage]
            : [];

          if (!hasDynamicError) {
            setDynamicError(true);
          }

          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiEmptyPrompt
                  actions={
                    visibleErrorMessages.length && !localState.expandError ? (
                      <EuiButtonEmpty
                        onClick={() => {
                          setLocalState((prevState: WorkspaceState) => ({
                            ...prevState,
                            expandError: !prevState.expandError,
                          }));
                        }}
                      >
                        {i18n.translate('xpack.lens.editorFrame.expandRenderingErrorButton', {
                          defaultMessage: 'Show details of error',
                        })}
                      </EuiButtonEmpty>
                    ) : null
                  }
                  body={
                    <>
                      <p data-test-subj="expression-failure">
                        <FormattedMessage
                          id="xpack.lens.editorFrame.dataFailure"
                          defaultMessage="An error occurred when loading data."
                        />
                      </p>

                      {localState.expandError
                        ? visibleErrorMessages.map((visibleErrorMessage) =>
                            typeof visibleErrorMessage === 'string' ? (
                              <p className="eui-textBreakWord" key={visibleErrorMessage}>
                                {visibleErrorMessage}
                              </p>
                            ) : (
                              visibleErrorMessage
                            )
                          )
                        : null}
                    </>
                  }
                  iconColor="danger"
                  iconType="warning"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      />
    </div>
  );
};
