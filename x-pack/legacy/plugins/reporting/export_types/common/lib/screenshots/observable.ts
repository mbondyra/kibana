/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { catchError, concatMap, first, mergeMap, take, takeUntil, toArray } from 'rxjs/operators';
import { CaptureConfig, HeadlessChromiumDriverFactory, ServerFacade } from '../../../../types';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getNumberOfItems } from './get_number_of_items';
import { getScreenshots } from './get_screenshots';
import { getTimeRange } from './get_time_range';
import { openUrl } from './open_url';
import { skipTelemetry } from './skip_telemetry';
import { ScreenSetupData, ScreenshotObservableOpts, ScreenshotResults } from './types';
import { waitForRenderComplete } from './wait_for_render';
import { waitForVisualizations } from './wait_for_visualizations';
import { injectCustomCss } from './inject_css';

export function screenshotsObservableFactory(
  server: ServerFacade,
  browserDriverFactory: HeadlessChromiumDriverFactory
) {
  const config = server.config();
  const captureConfig: CaptureConfig = config.get('xpack.reporting.capture');

  return function screenshotsObservable({
    logger,
    urls,
    conditionalHeaders,
    layout,
    browserTimezone,
  }: ScreenshotObservableOpts): Rx.Observable<ScreenshotResults[]> {
    const create$ = browserDriverFactory.createPage(
      { viewport: layout.getBrowserViewport(), browserTimezone },
      logger
    );
    return Rx.from(urls).pipe(
      concatMap(url => {
        return create$.pipe(
          mergeMap(({ driver, exit$ }) => {
            const setup$: Rx.Observable<ScreenSetupData> = Rx.of(1).pipe(
              takeUntil(exit$),
              mergeMap(() => openUrl(server, driver, url, conditionalHeaders, logger)),
              mergeMap(() => skipTelemetry(driver, logger)),
              mergeMap(() => getNumberOfItems(server, driver, layout, logger)),
              mergeMap(async itemsCount => {
                const viewport = layout.getViewport(itemsCount);
                await Promise.all([
                  driver.setViewport(viewport, logger),
                  waitForVisualizations(server, driver, itemsCount, layout, logger),
                ]);
              }),
              mergeMap(async () => {
                // Waiting till _after_ elements have rendered before injecting our CSS
                // allows for them to be displayed properly in many cases
                await injectCustomCss(driver, layout, logger);

                if (layout.positionElements) {
                  // position panel elements for print layout
                  await layout.positionElements(driver, logger);
                }

                await waitForRenderComplete(driver, layout, captureConfig, logger);
              }),
              mergeMap(async () => {
                return await Promise.all([
                  getTimeRange(driver, layout, logger),
                  getElementPositionAndAttributes(driver, layout, logger),
                ]).then(([timeRange, elementsPositionAndAttributes]) => ({
                  elementsPositionAndAttributes,
                  timeRange,
                }));
              }),
              catchError(err => {
                logger.error(err);
                return Rx.of({ elementsPositionAndAttributes: null, timeRange: null, error: err });
              })
            );

            return setup$.pipe(
              mergeMap(
                async (data: ScreenSetupData): Promise<ScreenshotResults> => {
                  const elements = data.elementsPositionAndAttributes
                    ? data.elementsPositionAndAttributes
                    : getDefaultElementPosition(layout.getViewport(1));
                  const screenshots = await getScreenshots(driver, elements, logger);
                  const { timeRange, error: setupError } = data;
                  return { timeRange, screenshots, error: setupError };
                }
              )
            );
          }),
          first()
        );
      }),
      take(urls.length),
      toArray()
    );
  };
}

/*
 * If an error happens setting up the page, we don't know if there actually
 * are any visualizations showing. These defaults should help capture the page
 * enough for the user to see the error themselves
 */
const getDefaultElementPosition = ({ height, width }: { height: number; width: number }) => [
  {
    position: {
      boundingClientRect: { top: 0, left: 0, height, width },
      scroll: { x: 0, y: 0 },
    },
    attributes: {},
  },
];
