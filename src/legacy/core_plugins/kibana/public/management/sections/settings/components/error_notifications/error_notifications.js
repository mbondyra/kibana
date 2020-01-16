/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { toastNotifications } from 'ui/notify';

import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const showImageCouldNotBeSaved = () => {
  return toastNotifications.addDanger(
    i18n.translate('kbn.management.settings.field.imageChangeErrorMessage', {
      defaultMessage: 'Image could not be saved',
    })
  );
};

const reloadButton = (
  <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiButton size="s" onClick={() => window.location.reload()}>
        {i18n.translate('kbn.management.settings.field.requiresPageReloadToastButtonLabel', {
          defaultMessage: 'Reload page',
        })}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const showPageReloadToast = settingsNames => {
  let title = i18n.translate('kbn.management.settings.field.requiresPageReloadToastDescription', {
    defaultMessage: 'Please reload the page for the "{settingName}" setting to take effect.',
    values: {
      settingName: settingsNames[0],
    },
  });

  if (settingsNames.length > 1) {
    title = i18n.translate(
      'kbn.management.settings.field.requiresPageReloadToastDescriptionMultipleFields',
      {
        // TODO: COPY NEEDED
        defaultMessage: 'Please reload the page for the settings: {settingsNames} to take effect.',
        values: {
          settingsNames: settingsNames.join(', '),
        },
      }
    );
  }
  toastNotifications.add({
    title: title,
    text: reloadButton,
    color: 'success',
  });
};

export const showUnableToSave = () =>
  toastNotifications.addDanger(
    i18n.translate('kbn.management.settings.field.saveFieldErrorMessage', {
      defaultMessage: 'Unable to save',
    })
  );
