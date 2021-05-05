/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';

import _ from 'lodash';
import React, { useEffect, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { Toast } from 'kibana/public';
import { VisualizeFieldContext } from 'src/plugins/ui_actions/public';
import { Datatable } from 'src/plugins/expressions/public';
import { EuiBreadcrumb } from '@elastic/eui';
import { downloadMultipleAs } from '../../../../../src/plugins/share/public';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  OnSaveProps,
  checkForDuplicateTitle,
} from '../../../../../src/plugins/saved_objects/public';
import { injectFilterReferences } from '../persistence';
import { NativeRenderer } from '../native_renderer';
import { trackUiEvent } from '../lens_ui_telemetry';
import {
  DataPublicPluginStart,
  esFilters,
  exporters,
  Filter,
  IndexPattern as IndexPatternInstance,
  IndexPatternsContract,
  Query,
  SavedQuery,
  syncQueryStateWithUrl,
} from '../../../../../src/plugins/data/public';
import { getFullPath, APP_ID } from '../../common';
import { LensAppProps, LensAppServices, LensAppState, DispatchSetState } from './types';
import { getLensTopNavConfig } from './lens_top_nav';
import { Document } from '../persistence';
import { SaveModal } from './save_modal';
import {
  LensByReferenceInput,
  LensEmbeddableInput,
} from '../editor_frame_service/embeddable/embeddable';
import { useTimeRange } from './time_range';
import { EditorFrameInstance } from '../types';
import { setState as setAppState, useLensSelector, useLensDispatch } from './state/index';

export function App({
  history,
  onAppLeave,
  redirectTo,
  editorFrame,
  initialInput,
  incomingState,
  redirectToOrigin,
  redirectToDashboard,
  setHeaderActionMenu,
  initialContext,
}: LensAppProps) {
  const {
    data,
    chrome,
    overlays,
    navigation,
    uiSettings,
    application,
    stateTransfer,
    notifications,
    attributeService,
    savedObjectsClient,
    savedObjectsTagging,
    getOriginatingAppName,
    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag,
  } = useKibana<LensAppServices>().services;

  console.log('##APPRERENDER')

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = useCallback(
    (state: Partial<LensAppState>) => dispatch(setAppState(state)),
    [dispatch, setAppState]
  );
  const appState = useLensSelector((state) => state.app);

  const { lastKnownDoc } = appState;

  const showNoDataPopover = useCallback(() => {
    dispatchSetState({ indicateNoData: true });
  }, [dispatchSetState]);

  useEffect(() => {
    if (appState.indicateNoData) {
      dispatchSetState({ indicateNoData: false });
    }
  }, [
    appState.indicateNoData,
    appState.query,
    appState.filters,
    appState.indexPatternsForTopNav,
    appState.searchSessionId,
  ]);

  const { resolvedDateRange, from: fromDate, to: toDate } = useTimeRange(
    data,
    lastKnownDoc,
    dispatchSetState,
    appState.searchSessionId
  );

  const onError = useCallback(
    (e: { message: string }) =>
      notifications.toasts.addDanger({
        title: e.message,
      }),
    [notifications.toasts]
  );

  const getLastKnownDocWithoutPinnedFilters = useCallback(
    function () {
      if (!lastKnownDoc) return undefined;
      const [pinnedFilters, appFilters] = _.partition(
        injectFilterReferences(lastKnownDoc.state?.filters || [], lastKnownDoc.references),
        esFilters.isFilterPinned
      );
      return pinnedFilters?.length
        ? {
            ...lastKnownDoc,
            state: {
              ...lastKnownDoc.state,
              filters: appFilters,
            },
          }
        : lastKnownDoc;
    },
    [lastKnownDoc]
  );

  const getIsByValueMode = useCallback(
    () =>
      Boolean(
        // Temporarily required until the 'by value' paradigm is default.
        dashboardFeatureFlag.allowByValueEmbeddables &&
          appState.isLinkedToOriginatingApp &&
          !(initialInput as LensByReferenceInput)?.savedObjectId
      ),
    [dashboardFeatureFlag.allowByValueEmbeddables, appState.isLinkedToOriginatingApp, initialInput]
  );

  useEffect(() => {
    const kbnUrlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(notifications.toasts),
    });
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      kbnUrlStateStorage
    );

    return () => {
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [notifications.toasts, uiSettings, data.query, history]);

  useEffect(() => {
    // when persistedDoc is moved, this can be moved up too
    console.log('onAppLeaveEffect');
    onAppLeave((actions) => {
      console.log('onAppLeaveInside');
      // Confirm when the user has made any changes to an existing doc
      // or when the user has configured something without saving
      if (
        application.capabilities.visualize.save &&
        !_.isEqual(appState.persistedDoc?.state, getLastKnownDocWithoutPinnedFilters()?.state) &&
        (appState.isSaveable || appState.persistedDoc)
      ) {
        return actions.confirm(
          i18n.translate('xpack.lens.app.unsavedWorkMessage', {
            defaultMessage: 'Leave Lens with unsaved work?',
          }),
          i18n.translate('xpack.lens.app.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          })
        );
      } else {
        return actions.default();
      }
    });
  }, [
    onAppLeave,
    lastKnownDoc,
    appState.isSaveable,
    appState.persistedDoc,
    getLastKnownDocWithoutPinnedFilters,
    application.capabilities.visualize.save,
  ]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    const isByValueMode = getIsByValueMode();
    const breadcrumbs: EuiBreadcrumb[] = [];
    if (appState.isLinkedToOriginatingApp && getOriginatingAppName() && redirectToOrigin) {
      breadcrumbs.push({
        onClick: () => {
          redirectToOrigin();
        },
        text: getOriginatingAppName(),
      });
    }
    if (!isByValueMode) {
      breadcrumbs.push({
        href: application.getUrlForApp('visualize'),
        onClick: (e) => {
          application.navigateToApp('visualize', { path: '/' });
          e.preventDefault();
        },
        text: i18n.translate('xpack.lens.breadcrumbsTitle', {
          defaultMessage: 'Visualize Library',
        }),
      });
    }
    let currentDocTitle = i18n.translate('xpack.lens.breadcrumbsCreate', {
      defaultMessage: 'Create',
    });
    if (appState.persistedDoc) {
      currentDocTitle = isByValueMode
        ? i18n.translate('xpack.lens.breadcrumbsByValue', { defaultMessage: 'Edit visualization' })
        : appState.persistedDoc.title;
    }
    breadcrumbs.push({ text: currentDocTitle });
    chrome.setBreadcrumbs(breadcrumbs);
  }, [
    dashboardFeatureFlag.allowByValueEmbeddables,
    appState.isLinkedToOriginatingApp,
    getOriginatingAppName,
    appState.persistedDoc,
    redirectToOrigin,
    getIsByValueMode,
    initialInput,
    application,
    chrome,
  ]);

  const tagsIds =
    appState.persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(appState.persistedDoc.references)
      : [];

  const runSave = async (
    saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
      returnToOrigin: boolean;
      dashboardId?: string | null;
      onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
      newDescription?: string;
      newTags?: string[];
    },
    options: { saveToLibrary: boolean }
  ) => {
    if (!lastKnownDoc) {
      return;
    }

    let references = lastKnownDoc.references;
    if (savedObjectsTagging) {
      references = savedObjectsTagging.ui.updateTagsReferences(
        references,
        saveProps.newTags || tagsIds
      );
    }

    const docToSave = {
      ...getLastKnownDocWithoutPinnedFilters()!,
      description: saveProps.newDescription,
      title: saveProps.newTitle,
      references,
    };

    // Required to serialize filters in by value mode until
    // https://github.com/elastic/kibana/issues/77588 is fixed
    if (getIsByValueMode()) {
      docToSave.state.filters.forEach((filter) => {
        if (typeof filter.meta.value === 'function') {
          delete filter.meta.value;
        }
      });
    }

    const originalInput = saveProps.newCopyOnSave ? undefined : initialInput;
    const originalSavedObjectId = (originalInput as LensByReferenceInput)?.savedObjectId;
    if (options.saveToLibrary) {
      try {
        await checkForDuplicateTitle(
          {
            id: originalSavedObjectId,
            title: docToSave.title,
            copyOnSave: saveProps.newCopyOnSave,
            lastSavedTitle: lastKnownDoc.title,
            getEsType: () => 'lens',
            getDisplayName: () =>
              i18n.translate('xpack.lens.app.saveModalType', {
                defaultMessage: 'Lens visualization',
              }),
          },
          saveProps.isTitleDuplicateConfirmed,
          saveProps.onTitleDuplicate,
          {
            savedObjectsClient,
            overlays,
          }
        );
      } catch (e) {
        // ignore duplicate title failure, user notified in save modal
        return;
      }
    }
    try {
      const newInput = (await attributeService.wrapAttributes(
        docToSave,
        options.saveToLibrary,
        originalInput
      )) as LensEmbeddableInput;

      if (saveProps.returnToOrigin && redirectToOrigin) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave((actions) => {
          return actions.default();
        });
        redirectToOrigin({ input: newInput, isCopied: saveProps.newCopyOnSave });
        return;
      } else if (saveProps.dashboardId && redirectToDashboard) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave((actions) => {
          return actions.default();
        });
        redirectToDashboard(newInput, saveProps.dashboardId);
        return;
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.lens.app.saveVisualization.successNotificationText', {
          defaultMessage: `Saved '{visTitle}'`,
          values: {
            visTitle: docToSave.title,
          },
        })
      );

      if (
        attributeService.inputIsRefType(newInput) &&
        newInput.savedObjectId !== originalSavedObjectId
      ) {
        chrome.recentlyAccessed.add(
          getFullPath(newInput.savedObjectId),
          docToSave.title,
          newInput.savedObjectId
        );
        dispatchSetState({ isLinkedToOriginatingApp: false, isSaveModalVisible: false });
        // remove editor state so the connection is still broken after reload
        stateTransfer.clearEditorState(APP_ID);

        redirectTo(newInput.savedObjectId);
        return;
      }

      const newDoc = {
        ...docToSave,
        ...newInput,
      };
      dispatchSetState({
        isLinkedToOriginatingApp: false,
        isSaveModalVisible: false,
        persistedDoc: newDoc,
        lastKnownDoc: newDoc,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.dir(e);
      trackUiEvent('save_failed');
      dispatchSetState({ isSaveModalVisible: false });
    }
  };

  const lastKnownDocRef = useRef(appState.lastKnownDoc);
  lastKnownDocRef.current = appState.lastKnownDoc;

  const activeDataRef = useRef(appState.activeData);
  activeDataRef.current = appState.activeData;

  const { TopNavMenu } = navigation.ui;

  const savingToLibraryPermitted = Boolean(
    appState.isSaveable && application.capabilities.visualize.save
  );
  const savingToDashboardPermitted = Boolean(
    appState.isSaveable && application.capabilities.dashboard?.showWriteControls
  );

  const unsavedTitle = i18n.translate('xpack.lens.app.unsavedFilename', {
    defaultMessage: 'unsaved',
  });
  const topNavConfig = getLensTopNavConfig({
    showSaveAndReturn: Boolean(
      appState.isLinkedToOriginatingApp &&
        // Temporarily required until the 'by value' paradigm is default.
        (dashboardFeatureFlag.allowByValueEmbeddables || Boolean(initialInput))
    ),
    enableExportToCSV: Boolean(
      appState.isSaveable && appState.activeData && Object.keys(appState.activeData).length
    ),
    isByValueMode: getIsByValueMode(),
    allowByValue: dashboardFeatureFlag.allowByValueEmbeddables,
    showCancel: Boolean(appState.isLinkedToOriginatingApp),
    savingToLibraryPermitted,
    savingToDashboardPermitted,
    actions: {
      exportToCSV: () => {
        if (!appState.activeData) {
          return;
        }
        const datatables = Object.values(appState.activeData);
        const content = datatables.reduce<Record<string, { content: string; type: string }>>(
          (memo, datatable, i) => {
            // skip empty datatables
            if (datatable) {
              const postFix = datatables.length > 1 ? `-${i + 1}` : '';

              memo[`${lastKnownDoc?.title || unsavedTitle}${postFix}.csv`] = {
                content: exporters.datatableToCSV(datatable, {
                  csvSeparator: uiSettings.get('csv:separator', ','),
                  quoteValues: uiSettings.get('csv:quoteValues', true),
                  formatFactory: data.fieldFormats.deserialize,
                }),
                type: exporters.CSV_MIME_TYPE,
              };
            }
            return memo;
          },
          {}
        );
        if (content) {
          downloadMultipleAs(content);
        }
      },
      saveAndReturn: () => {
        if (savingToDashboardPermitted && lastKnownDoc) {
          // disabling the validation on app leave because the document has been saved.
          onAppLeave((actions) => {
            return actions.default();
          });
          runSave(
            {
              newTitle: lastKnownDoc.title,
              newCopyOnSave: false,
              isTitleDuplicateConfirmed: false,
              returnToOrigin: true,
            },
            {
              saveToLibrary:
                (initialInput && attributeService.inputIsRefType(initialInput)) ?? false,
            }
          );
        }
      },
      showSaveModal: () => {
        if (savingToDashboardPermitted || savingToLibraryPermitted) {
          dispatchSetState({ isSaveModalVisible: true });
        }
      },
      cancel: () => {
        if (redirectToOrigin) {
          redirectToOrigin();
        }
      },
    },
  });

  return (
    <>
      <div className="lnsApp">
        <TopNavMenu
          setMenuMountPoint={setHeaderActionMenu}
          config={topNavConfig}
          showSearchBar={true}
          showDatePicker={true}
          showQueryBar={true}
          showFilterBar={true}
          indexPatterns={appState.indexPatternsForTopNav}
          showSaveQuery={Boolean(application.capabilities.visualize.saveQuery)}
          savedQuery={appState.savedQuery}
          data-test-subj="lnsApp_topNav"
          screenTitle={'lens'}
          appName={'lens'}
          onQuerySubmit={(payload) => {
            const { dateRange, query } = payload;
            const currentRange = data.query.timefilter.timefilter.getTime();
            if (dateRange.from !== currentRange.from || dateRange.to !== currentRange.to) {
              data.query.timefilter.timefilter.setTime(dateRange);
              trackUiEvent('app_date_change');
            } else {
              // Query has changed, renew the session id.
              // Time change will be picked up by the time subscription
              dispatchSetState({ searchSessionId: data.search.session.start() });
              trackUiEvent('app_query_change');
            }
            if (query && query !== appState.query) {
              console.log(query, appState.query);
              dispatchSetState({ query });
            }
          }}
          onSaved={(savedQuery) => {
            dispatchSetState({ savedQuery: { ...savedQuery } });
          }}
          onSavedQueryUpdated={(savedQuery) => {
            const savedQueryFilters = savedQuery.attributes.filters || [];
            const globalFilters = data.query.filterManager.getGlobalFilters();
            data.query.filterManager.setFilters([...globalFilters, ...savedQueryFilters]);

            dispatchSetState({ query: savedQuery.attributes.query, savedQuery: { ...savedQuery } });
          }}
          onClearSavedQuery={() => {
            data.query.filterManager.setFilters(data.query.filterManager.getGlobalFilters());
            dispatchSetState({
              query: data.query.queryString.getDefaultQuery(),
              filters: data.query.filterManager.getGlobalFilters(),
              savedQuery: undefined,
            });
          }}
          query={appState.query}
          dateRangeFrom={fromDate}
          dateRangeTo={toDate}
          indicateNoData={appState.indicateNoData}
        />
        {(!appState.isLoading || appState.persistedDoc) && (
          <MemoizedEditorFrameWrapper
            editorFrame={editorFrame}
            resolvedDateRange={resolvedDateRange}
            onError={onError}
            showNoDataPopover={showNoDataPopover}
            initialContext={initialContext}
            dispatchSetState={dispatchSetState}
            data={data}
            query={appState.query}
            filters={appState.filters}
            searchSessionId={appState.searchSessionId}
            isSaveable={appState.isSaveable}
            savedQuery={appState.savedQuery}
            persistedDoc={appState.persistedDoc}
            indexPatterns={appState.indexPatternsForTopNav}
            activeData={activeDataRef}
            lastKnownDoc={lastKnownDocRef}
          />
        )}
      </div>
      <SaveModal
        isVisible={appState.isSaveModalVisible}
        originatingApp={
          appState.isLinkedToOriginatingApp ? incomingState?.originatingApp : undefined
        }
        savingToLibraryPermitted={savingToLibraryPermitted}
        allowByValueEmbeddables={dashboardFeatureFlag.allowByValueEmbeddables}
        savedObjectsTagging={savedObjectsTagging}
        tagsIds={tagsIds}
        onSave={runSave}
        onClose={() => dispatchSetState({ isSaveModalVisible: false })}
        getAppNameFromId={() => getOriginatingAppName()}
        lastKnownDoc={lastKnownDoc}
        returnToOriginSwitchLabel={
          getIsByValueMode() && initialInput
            ? i18n.translate('xpack.lens.app.updatePanel', {
                defaultMessage: 'Update panel on {originatingAppName}',
                values: { originatingAppName: getOriginatingAppName() },
              })
            : undefined
        }
      />
    </>
  );
}

const MemoizedEditorFrameWrapper = React.memo(function EditorFrameWrapper({
  editorFrame,
  query,
  filters,
  searchSessionId,
  isSaveable: oldIsSaveable,
  savedQuery,
  persistedDoc,
  indexPatterns: indexPatternsForTopNav,
  resolvedDateRange,
  onError,
  showNoDataPopover,
  initialContext,
  dispatchSetState,
  data,
  lastKnownDoc,
  activeData: activeDataRef,
}: {
  editorFrame: EditorFrameInstance;
  searchSessionId: string;
  query: Query;
  filters: Filter[];
  isSaveable: boolean;
  savedQuery?: SavedQuery;
  persistedDoc?: Document | undefined;
  indexPatterns: IndexPatternInstance[];
  resolvedDateRange: { fromDate: string; toDate: string };
  onError: (e: { message: string }) => Toast;
  showNoDataPopover: () => void;
  initialContext: VisualizeFieldContext | undefined;
  dispatchSetState: DispatchSetState;
  data: DataPublicPluginStart;
  lastKnownDoc: React.MutableRefObject<Document | undefined>;
  activeData: React.MutableRefObject<Record<string, Datatable> | undefined>;
}) {
  return (
    <NativeRenderer
      className="lnsApp__frame"
      render={editorFrame.mount}
      nativeProps={{
        searchSessionId,
        dateRange: resolvedDateRange,
        query,
        filters,
        savedQuery,
        doc: persistedDoc,
        onError,
        showNoDataPopover,
        initialContext,
        onChange: async ({ filterableIndexPatterns, doc, isSaveable, activeData }) => {
          const hasSaveableChanged = isSaveable !== oldIsSaveable;
          const hasDocChanged =
            !_.isEqual(persistedDoc, doc) && !_.isEqual(lastKnownDoc.current, doc);
          const hasDataChanged = !_.isEqual(activeDataRef.current, activeData);
          console.log(activeDataRef.current, activeData)
          const hasIndexPatternsChanged =
            indexPatternsForTopNav.length !== filterableIndexPatterns.length ||
            filterableIndexPatterns.some(
              (id) => !indexPatternsForTopNav.find((indexPattern) => indexPattern.id === id)
            );

          let batchedStateToUpdate: Partial<LensAppState> = {};

          if (hasSaveableChanged) {
            batchedStateToUpdate.isSaveable = isSaveable;
          }
          if (hasDocChanged) {
            batchedStateToUpdate.lastKnownDoc = doc;
          }
          if (hasDataChanged) {
            batchedStateToUpdate.activeData = activeData;
          }

          // Update the cached index patterns if the user made a change to any of them
          if (hasIndexPatternsChanged) {
            const { indexPatterns } = await getAllIndexPatterns(
              filterableIndexPatterns,
              data.indexPatterns
            );
            if (indexPatterns) {
              batchedStateToUpdate.indexPatternsForTopNav = indexPatterns;
            }
          }
          if (Object.keys(batchedStateToUpdate).length) {
            dispatchSetState(batchedStateToUpdate);
          }
        },
      }}
    />
  );
});

export async function getAllIndexPatterns(
  ids: string[],
  indexPatternsService: IndexPatternsContract
): Promise<{ indexPatterns: IndexPatternInstance[]; rejectedIds: string[] }> {
  const responses = await Promise.allSettled(ids.map((id) => indexPatternsService.get(id)));
  const fullfilled = responses.filter(
    (response): response is PromiseFulfilledResult<IndexPatternInstance> =>
      response.status === 'fulfilled'
  );
  const rejectedIds = responses
    .map((_response, i) => ids[i])
    .filter((id, i) => responses[i].status === 'rejected');
  // return also the rejected ids in case we want to show something later on
  return { indexPatterns: fullfilled.map((response) => response.value), rejectedIds };
}
