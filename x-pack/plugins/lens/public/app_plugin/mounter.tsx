/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import _ from 'lodash';
import { AppMountParameters, CoreSetup } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { DashboardFeatureFlagConfig } from 'src/plugins/dashboard/public';
import { Provider } from 'react-redux';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { LensReportManager, setReportManager, trackUiEvent } from '../lens_ui_telemetry';

import { App, getAllIndexPatterns } from './app';
import { EditorFrameStart } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { LensPluginStartDependencies } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE, APP_ID, getFullPath } from '../../common';
import {
  LensEmbeddableInput,
  LensByReferenceInput,
  LensByValueInput,
} from '../editor_frame_service/embeddable/embeddable';
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { lensStore, setStateM, syncExternalContextState, LensAppState } from '../state/index';
import { injectFilterReferences } from '../persistence';
import { syncLensFilterState } from './lib';
import { registerValueSuggestionsRoute } from 'src/plugins/data/server/autocomplete/value_suggestions_route';

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    getByValueFeatureFlag: () => Promise<DashboardFeatureFlagConfig>;
    attributeService: () => Promise<LensAttributeService>;
    getPresentationUtilContext: () => Promise<FC>;
  }
) {
  const {
    createEditorFrame,
    getByValueFeatureFlag,
    attributeService,
    getPresentationUtilContext,
  } = mountProps;
  const [coreStart, startDependencies] = await core.getStartServices();
  const { data, navigation, embeddable, savedObjectsTagging, charts } = startDependencies;

  const instance = await createEditorFrame();
  const storage = new Storage(localStorage);
  const stateTransfer = embeddable?.getStateTransfer();
  const historyLocationState = params.history.location.state as HistoryLocationState;
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);

  const lensServices: LensAppServices = {
    data,
    storage,
    navigation,
    stateTransfer,
    savedObjectsTagging,
    attributeService: await attributeService(),
    http: coreStart.http,
    chrome: coreStart.chrome,
    overlays: coreStart.overlays,
    uiSettings: coreStart.uiSettings,
    application: coreStart.application,
    notifications: coreStart.notifications,
    savedObjectsClient: coreStart.savedObjects.client,
    getOriginatingAppName: () => {
      return embeddableEditorIncomingState?.originatingApp
        ? stateTransfer?.getAppNameFromId(embeddableEditorIncomingState.originatingApp)
        : undefined;
    },

    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag: await getByValueFeatureFlag(),
  };

  addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);
  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.lens.pageTitle', { defaultMessage: 'Lens' })
  );

  setReportManager(
    new LensReportManager({
      http: core.http,
      storage,
    })
  );

  const getInitialInput = (id?: string, editByValue?: boolean): LensEmbeddableInput | undefined => {
    if (editByValue) {
      return embeddableEditorIncomingState?.valueInput as LensByValueInput;
    }
    if (id) {
      return { savedObjectId: id } as LensByReferenceInput;
    }
  };

  const redirectTo = (history: History<unknown>, savedObjectId?: string) => {
    if (!savedObjectId) {
      history.push({ pathname: '/', search: history.location.search });
    } else {
      history.push({
        pathname: `/edit/${savedObjectId}`,
        search: history.location.search,
      });
    }
  };

  const redirectToDashboard = (embeddableInput: LensEmbeddableInput, dashboardId: string) => {
    if (!lensServices.dashboardFeatureFlag.allowByValueEmbeddables) {
      throw new Error('redirectToDashboard called with by-value embeddables disabled');
    }

    const state = {
      input: embeddableInput,
      type: LENS_EMBEDDABLE_TYPE,
    };

    const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;
    stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
      state,
      path,
    });
  };

  const redirectToOrigin = (props?: RedirectToOriginProps) => {
    if (!embeddableEditorIncomingState?.originatingApp) {
      throw new Error('redirectToOrigin called without an originating app');
    }
    if (stateTransfer && props?.input) {
      const { input, isCopied } = props;
      stateTransfer.navigateToWithEmbeddablePackage(embeddableEditorIncomingState?.originatingApp, {
        state: {
          embeddableId: isCopied ? undefined : embeddableEditorIncomingState.embeddableId,
          type: LENS_EMBEDDABLE_TYPE,
          input,
        },
      });
    } else {
      coreStart.application.navigateToApp(embeddableEditorIncomingState?.originatingApp);
    }
  };

  const initialContext =
    historyLocationState && historyLocationState.type === ACTION_VISUALIZE_LENS_FIELD
      ? historyLocationState.payload
      : undefined;

  const dispatchSetState = (state: Partial<LensAppState>) => lensStore.dispatch(setStateM(state));

  const { stopSyncingExternalContextState } = syncExternalContextState({
    data,
    initialContext,
    getState: lensStore.getState,
    dispatchSetState,
  });

  const initEmptyDocState = (initialInput?: LensEmbeddableInput) => {
    return {
      isAppLoading: Boolean(initialInput), // isAppLoading should be
      isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
      searchSessionId: data.search.session.start(),
      // Do not use app-specific filters from previous app,
      // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
      filters: !initialContext
        ? data.query.filterManager.getGlobalFilters()
        : data.query.filterManager.getFilters(),
      query: data.query.queryString.getQuery(),
      persistedDoc: undefined,
      lastKnownDoc: undefined,
    };
  };

  function loadDoc(
    redirectToCallback: (savedObjectId?: string) => void,
    initialInput?: LensEmbeddableInput
  ) {
    const { attributeService: attributeServiceInstance, chrome, notifications } = lensServices;
    console.log('Mounter: loadDoc');
    if (
      !initialInput ||
      (attributeServiceInstance.inputIsRefType(initialInput) &&
        initialInput.savedObjectId === lensStore.getState().app.persistedDoc?.savedObjectId)
    ) {
      const initialState = initEmptyDocState(initialInput);
      return dispatchSetState(initialState);
    }

    dispatchSetState({ isAppLoading: true });
    attributeServiceInstance
      .unwrapAttributes(initialInput)
      .then(async (attributes) => {
        if (!initialInput) {
          return initEmptyDocState(initialInput);
        }
        const doc = {
          ...initialInput,
          ...attributes,
          type: LENS_EMBEDDABLE_TYPE,
        };

        if (attributeServiceInstance.inputIsRefType(initialInput)) {
          chrome.recentlyAccessed.add(
            getFullPath(initialInput.savedObjectId),
            attributes.title,
            initialInput.savedObjectId
          );
        }
        const indexPatternIds = _.uniq(
          doc.references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id)
        );
        try {
          const { indexPatterns } = await getAllIndexPatterns(indexPatternIds, data.indexPatterns);
          // Don't overwrite any pinned filters
          data.query.filterManager.setAppFilters(
            injectFilterReferences(doc.state.filters, doc.references)
          );

          return {
            isAppLoading: false,
            indexPatternsForTopNav: indexPatterns,
            query: doc.state.query,
            persistedDoc: doc,
            lastKnownDoc: doc,

            isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
            // Do not use app-specific filters from previous app,
            // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
            filters: !initialContext
              ? data.query.filterManager.getGlobalFilters()
              : data.query.filterManager.getFilters(),
          };
        } catch (err) {
          dispatchSetState({ isAppLoading: false });
          redirectToCallback();
        }
      })
      .then((initialState) => {
        console.log('Mounter: dispatch initial state', initialState);
        if (initialState) {
          dispatchSetState(initialState);
        }
      })
      .then((state) => {
        console.log(state);
        dispatchSetState(state);
      })
      .catch((e) => {
        dispatchSetState({ isAppLoading: false });
        notifications.toasts.addDanger(
          i18n.translate('xpack.lens.app.docLoadingError', {
            defaultMessage: 'Error loading saved document',
          })
        );

        redirectToCallback();
      });
  }

  // const featureFlagConfig = await getByValueFeatureFlag();
  const EditorRenderer = React.memo(
    (props: { id?: string; history: History<unknown>; editByValue?: boolean }) => {
      const redirectCallback = useCallback(
        (id?: string) => {
          redirectTo(props.history, id);
        },
        [props.history]
      );
      trackUiEvent('loaded');
      const initialInput = getInitialInput(props.id, props.editByValue);

      loadDoc(redirectCallback, initialInput);

      return (
        <App
          incomingState={embeddableEditorIncomingState}
          editorFrame={instance}
          initialInput={initialInput}
          redirectTo={redirectCallback}
          redirectToOrigin={redirectToOrigin}
          redirectToDashboard={redirectToDashboard}
          onAppLeave={params.onAppLeave}
          setHeaderActionMenu={params.setHeaderActionMenu}
          history={props.history}
          initialContext={initialContext}
        />
      );
    }
  );

  const EditorRoute = (
    routeProps: RouteComponentProps<{ id?: string }> & { editByValue?: boolean }
  ) => {
    return (
      <EditorRenderer
        id={routeProps.match.params.id}
        editByValue={routeProps.editByValue}
        history={routeProps.history}
      />
    );
  };

  function NotFound() {
    trackUiEvent('loaded_404');
    return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
  }
  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = params.history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  params.element.classList.add('lnsAppWrapper');

  const PresentationUtilContext = await getPresentationUtilContext();

  render(
    <I18nProvider>
      <KibanaContextProvider services={lensServices}>
        <Provider store={lensStore}>
          <PresentationUtilContext>
            <HashRouter>
              <Switch>
                <Route exact path="/edit/:id" component={EditorRoute} />
                <Route
                  exact
                  path={`/${LENS_EDIT_BY_VALUE}`}
                  render={(routeProps) => <EditorRoute {...routeProps} editByValue />}
                />
                <Route exact path="/" component={EditorRoute} />
                <Route path="/" component={NotFound} />
              </Switch>
            </HashRouter>
          </PresentationUtilContext>
        </Provider>
      </KibanaContextProvider>
    </I18nProvider>,
    params.element
  );

  return () => {
    dispatchSetState(initEmptyDocState());
    data.search.session.clear();
    instance.unmount();
    unmountComponentAtNode(params.element);
    unlistenParentHistory();
    stopSyncingExternalContextState();
  };
}
