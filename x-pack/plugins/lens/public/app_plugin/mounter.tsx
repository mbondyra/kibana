/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';

import { delay, finalize, switchMap, tap } from 'rxjs/operators';
import { AppMountParameters, CoreSetup } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { waitUntilNextSessionCompletes$ } from '../../../../../src/plugins/data/public';
import { DashboardFeatureFlagConfig } from 'src/plugins/dashboard/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { LensReportManager, setReportManager, trackUiEvent } from '../lens_ui_telemetry';

import { App } from './app';
import { EditorFrameStart } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { LensPluginStartDependencies } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE, APP_ID } from '../../common';
import {
  LensEmbeddableInput,
  LensByReferenceInput,
  LensByValueInput,
} from '../editor_frame_service/embeddable/embeddable';
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { Provider } from 'react-redux';
import { lensStore, setStateM } from './redux-toolkit';

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
  const { data, navigation, embeddable, savedObjectsTagging } = startDependencies;

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

  // Clear app-specific filters when navigating to Lens. Necessary because Lens
  // can be loaded without a full page refresh. If the user navigates to Lens from Discover
  // we keep the filters
  if (!initialContext) {
    data.query.filterManager.setAppFilters([]);
  }
   const startSession = () => data.search.session.start();

  const appState = lensStore.getState().app;

  const sessionSubscription = data.search.session
    .getSession$()
    // wait for a tick to filter/timerange subscribers the chance to update the session id in the state
    .pipe(delay(0))
    // then update if it didn't get updated yet
    .subscribe((newSessionId) => {
      if (newSessionId && appState.searchSessionId !== newSessionId) {
        console.log(
          `%c sessionSubscription ${newSessionId} ${appState.searchSessionId}`,
          'background: #222; color: #bada55'
        );
        lensStore.dispatch(
          setStateM({
            searchSessionId: newSessionId,
          })
        );
      }
    });

  const filterSubscription = data.query.filterManager.getUpdates$().subscribe({
    next: () => {
      lensStore.dispatch(
        setStateM({
          searchSessionId: startSession(),
          filters: data.query.filterManager.getFilters(),
        })
      );
      trackUiEvent('app_filters_updated');
      console.log('%c filterSubscription ', 'background: #222; color: #bada55');
    },
  });

  const timeSubscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
    next: () => {
      lensStore.dispatch(setStateM({ searchSessionId: startSession() }));

      console.log('%c timeSubscription ', 'background: #222; color: #bada55');
    },
  });

  const autoRefreshSubscription = data.query.timefilter.timefilter
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        lensStore.dispatch(setStateM({ searchSessionId: startSession() }));
        console.log(
          '%c timeautoRefreshSubscriptionSubscription ',
          'background: #222; color: #bada55'
        );
      }),
      switchMap((done) =>
        // best way in lens to estimate that all panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(data.search.session).pipe(finalize(done))
      )
    )
    .subscribe();

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
      console.log('initialInput', initialInput);
      console.log(
        'isLinkedToOriginatingApp',
        Boolean(embeddableEditorIncomingState?.originatingApp)
      );
      // todo move to place where it's not rerendering
      lensStore.dispatch(
        setStateM({
          isLoading: Boolean(initialInput),
          isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
          searchSessionId: data.search.session.start(),
          // Do not use app-specific filters from previous app,
          // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
          filters: !initialContext
            ? data.query.filterManager.getGlobalFilters()
            : data.query.filterManager.getFilters(),
          query: data.query.queryString.getQuery(),
        })
      );

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
        history={routeProps.history}
        editByValue={routeProps.editByValue}
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
    data.search.session.clear();
    instance.unmount();
    unmountComponentAtNode(params.element);
    unlistenParentHistory();

    filterSubscription.unsubscribe();
    timeSubscription.unsubscribe();
    autoRefreshSubscription.unsubscribe();
    sessionSubscription.unsubscribe();
  };
}
