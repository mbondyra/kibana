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

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import { npStart } from 'ui/new_platform';
import classNames from 'classnames';
import 'brace/theme/textmate';
import 'brace/mode/markdown';
import { showImageCouldNotBeSaved } from '../error_notifications';
import {
  EuiBadge,
  EuiCodeEditor,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiImage,
  EuiLink,
  EuiToolTip,
  EuiText,
  EuiSelect,
  EuiCode,
  EuiCodeBlock,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { isDefaultValue } from '../../lib';
import { getEditableValueFromSetting, getEditableValue } from '../utils';

const getImageAsBase64 = file => {
  if (!file instanceof File) {
    return null;
  }

  const reader = new FileReader();
  reader.readAsDataURL(file);

  return new Promise((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = err => {
      reject(err);
    };
  });
};

const getDisplayedDefaultValue = (type, defVal, optionLabels = {}) => {
  if (defVal === undefined || defVal === null || defVal === '') {
    return 'null';
  }
  switch (type) {
    case 'array':
      return defVal.join(', ');
    case 'select':
      return optionLabels.hasOwnProperty(defVal) ? optionLabels[defVal] : String(defVal);
    default:
      return String(defVal);
  }
};

const DefaultValue = ({ setting }) => {
  const { type, defVal, optionLabels } = setting;
  if (isDefaultValue(setting)) {
    return null;
  }
  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiText size="xs">
        {type === 'json' ? (
          <FormattedMessage
            id="kbn.management.settings.field.defaultValueTypeJsonText"
            defaultMessage="Default: {value}"
            values={{
              value: (
                <EuiCodeBlock
                  language="json"
                  paddingSize="s"
                  overflowHeight={defVal.length >= 500 ? 300 : null}
                >
                  {getDisplayedDefaultValue(type, defVal)}
                </EuiCodeBlock>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="kbn.management.settings.field.defaultValueText"
            defaultMessage="Default: {value}"
            values={{
              value: <EuiCode>{getDisplayedDefaultValue(type, defVal, optionLabels)}</EuiCode>,
            }}
          />
        )}
      </EuiText>
    </Fragment>
  );
};

export class Field extends PureComponent {
  static propTypes = {
    setting: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    clearChange: PropTypes.func.isRequired,
    enableSaving: PropTypes.bool.isRequired,
    loading: PropTypes.bool.isRequired,
  };

  changeImageForm = React.createRef();

  handleChange = unsavedChanges => {
    const { handleChange, setting } = this.props;
    handleChange(setting.name, unsavedChanges);
  };

  resetField = () => {
    const { type, defVal } = this.props.setting;
    if (type === 'image') {
      this.cancelChangeImage();
      return this.handleChange({
        value: getEditableValue(type, defVal),
        changeImage: true,
      });
    }

    return this.handleChange({ value: getEditableValue(type, defVal) });
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.setting.type === 'image' &&
      prevProps.unsavedChanges?.value &&
      !this.props.unsavedChanges?.value
    ) {
      this.cancelChangeImage();
    }
  }

  setLoading(loading) {
    this.setState({
      loading,
    });
  }

  onCodeEditorChange = value => {
    const { defVal, type } = this.props.setting;
    let newUnsavedValue = undefined;
    let isInvalid = false;
    let error = null;

    switch (type) {
      case 'json':
        const isJsonArray = defVal => Array.isArray(JSON.parse(defVal || '{}'));
        newUnsavedValue = value.trim() || (isJsonArray(defVal) ? '[]' : '{}');
        try {
          JSON.parse(newUnsavedValue);
        } catch (e) {
          isInvalid = true;
          error = (
            <FormattedMessage
              id="kbn.management.settings.field.codeEditorSyntaxErrorMessage"
              defaultMessage="Invalid JSON syntax"
            />
          );
        }
        break;
      default:
        newUnsavedValue = value;
    }

    this.handleChange({
      value: newUnsavedValue,
      error,
      isInvalid,
    });
  };

  onFieldChange = e => {
    const targetValue = e.target.value;
    const { type, validation, value, defVal } = this.props.setting;

    let newUnsavedValue = undefined;

    switch (type) {
      case 'boolean':
        const { unsavedChanges } = this.props;
        const currentValue = unsavedChanges
          ? unsavedChanges.value
          : getEditableValueFromSetting(type, value, defVal);
        newUnsavedValue = !currentValue;
        break;
      case 'number':
        newUnsavedValue = Number(targetValue);
        break;
      default:
        newUnsavedValue = targetValue;
    }

    let isInvalid = false;
    let error = undefined;

    if (validation?.regex) {
      if (!validation.regex.test(newUnsavedValue)) {
        error = validation.message;
        isInvalid = true;
      }
    }

    this.handleChange({
      value: newUnsavedValue,
      isInvalid,
      error,
    });
  };

  onImageChange = async files => {
    if (!files.length) {
      this.handleChange({
        changeImage: false,
      });
      return;
    }

    const file = files[0];
    const { maxSize } = this.props.setting.validation;
    try {
      const base64Image = await getImageAsBase64(file);
      const isInvalid = !!(maxSize?.length && base64Image.length > maxSize.length);

      this.handleChange({
        changeImage: true,
        value: base64Image,
        isInvalid,
        error: isInvalid
          ? i18n.translate('kbn.management.settings.field.imageTooLargeErrorMessage', {
              defaultMessage: 'Image is too large, maximum size is {maxSizeDescription}',
              values: {
                maxSizeDescription: maxSize.description,
              },
            })
          : null,
      });
    } catch (err) {
      showImageCouldNotBeSaved();
      this.cancelChangeImage();
    }
  };

  changeImage = () => {
    this.handleChange({
      value: null,
      changeImage: true,
    });
  };

  cancelChangeImage = () => {
    if (this.changeImageForm.current) {
      this.changeImageForm.current.fileInput.value = null;
      this.changeImageForm.current.handleChange({});
    }

    this.props.clearChange(this.props.setting.name);
  };

  renderField(setting) {
    const { enableSaving, unsavedChanges, loading } = this.props;
    const {
      name,
      value,
      type,
      options,
      optionLabels = {},
      isOverridden,
      ariaName,
      defVal,
    } = setting;
    const currentValue = unsavedChanges
      ? unsavedChanges.value
      : getEditableValueFromSetting(type, value, defVal);

    switch (type) {
      case 'boolean':
        return (
          <EuiSwitch
            label={
              !!currentValue ? (
                <FormattedMessage id="kbn.management.settings.field.onLabel" defaultMessage="On" />
              ) : (
                <FormattedMessage
                  id="kbn.management.settings.field.offLabel"
                  defaultMessage="Off"
                />
              )
            }
            checked={!!currentValue}
            onChange={this.onFieldChange}
            disabled={loading || isOverridden || !enableSaving}
            data-test-subj={`advancedSetting-editField-${name}`}
            aria-label={ariaName}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <div data-test-subj={`advancedSetting-editField-${name}`}>
            <EuiCodeEditor
              value={currentValue}
              onChange={this.onCodeEditorChange}
              mode={type}
              aria-label={ariaName}
              isReadOnly={isOverridden || !enableSaving}
              theme="textmate"
              width="100%"
              height="auto"
              minLines={6}
              maxLines={30}
              setOptions={{
                showLineNumbers: false,
                tabSize: 2,
              }}
              editorProps={{
                $blockScrolling: Infinity,
              }}
              showGutter={false}
              fullWidth
            />
          </div>
        );
      case 'image':
        const changeImage = unsavedChanges?.changeImage;
        if (!isDefaultValue(setting) && !changeImage) {
          return <EuiImage aria-label={ariaName} allowFullScreen url={value} alt={name} />;
        } else {
          return (
            <EuiFilePicker
              disabled={loading || isOverridden || !enableSaving}
              onChange={this.onImageChange}
              accept=".jpg,.jpeg,.png"
              ref={this.changeImageForm}
              data-test-subj={`advancedSetting-editField-${name}`}
              fullWidth
            />
          );
        }
      case 'select':
        return (
          <EuiSelect
            aria-label={ariaName}
            value={currentValue}
            options={options.map(option => {
              return {
                text: optionLabels.hasOwnProperty(option) ? optionLabels[option] : option,
                value: option,
              };
            })}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            data-test-subj={`advancedSetting-editField-${name}`}
            fullWidth
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            aria-label={ariaName}
            value={currentValue}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            data-test-subj={`advancedSetting-editField-${name}`}
            fullWidth
          />
        );
      default:
        return (
          <EuiFieldText
            aria-label={ariaName}
            value={currentValue}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            data-test-subj={`advancedSetting-editField-${name}`}
            fullWidth
          />
        );
    }
  }

  renderHelpText(setting) {
    if (setting.isOverridden) {
      return (
        <EuiText size="xs">
          <FormattedMessage
            id="kbn.management.settings.field.helpText"
            defaultMessage="This setting is overridden by the Kibana server and can not be changed."
          />
        </EuiText>
      );
    }

    const canUpdateSetting = this.props.enableSaving;
    const defaultLink = this.renderResetToDefaultLink(setting);
    const imageLink = this.renderChangeImageLink(setting);

    if (canUpdateSetting && (defaultLink || imageLink)) {
      return (
        <span>
          {defaultLink}
          {imageLink}
        </span>
      );
    }
    return null;
  }

  renderTitle(setting) {
    return (
      <h3>
        {setting.displayName || setting.name}
        {setting.isCustom ? (
          <EuiIconTip
            type="asterisk"
            color="primary"
            aria-label={i18n.translate('kbn.management.settings.field.customSettingAriaLabel', {
              defaultMessage: 'Custom setting',
            })}
            content={
              <FormattedMessage
                id="kbn.management.settings.field.customSettingTooltip"
                defaultMessage="Custom setting"
              />
            }
          />
        ) : (
          ''
        )}
      </h3>
    );
  }

  renderDescription(setting) {
    let description;
    let deprecation;

    if (setting.deprecation) {
      const { links } = npStart.core.docLinks;

      deprecation = (
        <>
          <EuiToolTip content={setting.deprecation.message}>
            <EuiBadge
              color="warning"
              onClick={() => {
                window.open(links.management[setting.deprecation.docLinksKey], '_blank');
              }}
              onClickAriaLabel={i18n.translate(
                'kbn.management.settings.field.deprecationClickAreaLabel',
                {
                  defaultMessage: 'Click to view deprecation documentation for {settingName}.',
                  values: {
                    settingName: setting.name,
                  },
                }
              )}
            >
              Deprecated
            </EuiBadge>
          </EuiToolTip>
          <EuiSpacer size="s" />
        </>
      );
    }

    if (React.isValidElement(setting.description)) {
      description = setting.description;
    } else {
      description = (
        <div
          /*
           * Justification for dangerouslySetInnerHTML:
           * Setting description may contain formatting and links to documentation.
           */
          dangerouslySetInnerHTML={{ __html: setting.description }} //eslint-disable-line react/no-danger
        />
      );
    }

    return (
      <Fragment>
        {deprecation}
        {description}
        <DefaultValue setting={setting} />
      </Fragment>
    );
  }

  renderResetToDefaultLink(setting) {
    const { defVal, ariaName, name } = setting;
    if (
      defVal === this.props.unsavedChanges?.value ||
      isDefaultValue(setting) ||
      this.props.loading
    ) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('kbn.management.settings.field.resetToDefaultLinkAriaLabel', {
            defaultMessage: 'Reset {ariaName} to default',
            values: {
              ariaName,
            },
          })}
          onClick={this.resetField}
          data-test-subj={`advancedSetting-resetField-${name}`}
        >
          <FormattedMessage
            id="kbn.management.settings.field.resetToDefaultLinkText"
            defaultMessage="Reset to default"
          />
        </EuiLink>
        &nbsp;&nbsp;&nbsp;
      </span>
    );
  }

  renderChangeImageLink(setting) {
    const changeImage = this.props.unsavedChanges?.changeImage;
    const { type, value, ariaName, name } = setting;
    if (type !== 'image' || !value || changeImage) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('kbn.management.settings.field.changeImageLinkAriaLabel', {
            defaultMessage: 'Change {ariaName}',
            values: {
              ariaName,
            },
          })}
          onClick={this.changeImage}
          data-test-subj={`advancedSetting-changeImage-${name}`}
        >
          <FormattedMessage
            id="kbn.management.settings.field.changeImageLinkText"
            defaultMessage="Change image"
          />
        </EuiLink>
      </span>
    );
  }

  render() {
    const { setting, unsavedChanges } = this.props;
    const error = unsavedChanges?.error;
    const isInvalid = unsavedChanges?.isInvalid;
    // TODO: STYLES NEEDED
    const className = classNames('mgtAdvancedSettings__field', {
      'mgtAdvancedSettings__field--unsaved': unsavedChanges,
      // this might be unnecessary as we already have the message 'is invalid'
      'mgtAdvancedSettings__field--invalid': isInvalid,
    });

    return (
      <EuiFlexGroup className={className}>
        <EuiFlexItem>
          <EuiDescribedFormGroup
            fullWidth
            className="mgtAdvancedSettings__fieldWrapper"
            title={this.renderTitle(setting)}
            description={this.renderDescription(setting)}
            idAria={`${setting.name}-aria`}
          >
            <EuiFormRow
              fullWidth
              isInvalid={isInvalid}
              error={error}
              label={setting.name}
              helpText={this.renderHelpText(setting)}
              describedByIds={[`${setting.name}-aria`]}
              className="mgtAdvancedSettings__fieldRow"
              hasChildLabel={setting.type !== 'boolean'}
            >
              {this.renderField(setting)}
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
