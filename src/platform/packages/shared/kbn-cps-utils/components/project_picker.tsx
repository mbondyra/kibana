/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiPopover,
  EuiToolTip,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiTourStep,
  EuiButton,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ProjectRouting } from '@kbn/es-query';
import type { ProjectsData } from '../types';
import { PROJECT_ROUTING } from '../constants';
import { ProjectPickerContent } from './project_picker_content';
import { useFetchProjects } from './use_fetch_projects';
import { useProjectPickerTour } from './use_project_picker_tour';
import { strings } from './strings';
import { CPSIcon, CPSIconDisabled } from './cps_icon';

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
  fetchProjects: () => Promise<ProjectsData | null>;
  isReadonly?: boolean;
  readonlyTitle?: string;
}

export interface ProjectPickerButtonProps {
  projectRouting?: ProjectRouting;
  linkedProjectsCount: number;
  onClick: () => void;
  variant?: 'header' | 'lens';
  hasOverride?: boolean;
}

export const ProjectPickerButton = ({
  projectRouting,
  linkedProjectsCount,
  onClick,
  variant = 'header',
  hasOverride = false,
}: ProjectPickerButtonProps) => {
  const styles = useMemoCss(projectPickerStyles);

  if (variant === 'lens') {
    return (
      <EuiToolTip
        delay="long"
        content={strings.getProjectPickerButtonLabel(
          projectRouting === PROJECT_ROUTING.ORIGIN ? 1 : linkedProjectsCount + 1,
          linkedProjectsCount + 1
        )}
        disableScreenReaderOutput
      >
        <div css={styles.lensButtonWrapper}>
          <EuiButtonIcon
            aria-label={strings.getProjectPickerButtonAriaLabel()}
            data-test-subj="project-picker-button"
            onClick={onClick}
            size="s"
            iconType={CPSIcon}
            display="base"
            color="text"
          />
          {hasOverride && <span css={styles.overrideBadge} data-test-subj="project-picker-override-badge" />}
        </div>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      delay="long"
      content={strings.getProjectPickerButtonLabel(
        projectRouting === PROJECT_ROUTING.ORIGIN ? 1 : linkedProjectsCount + 1,
        linkedProjectsCount + 1
      )}
      disableScreenReaderOutput
    >
      <EuiHeaderSectionItemButton
        aria-label={strings.getProjectPickerButtonAriaLabel()}
        data-test-subj="project-picker-button"
        onClick={onClick}
        size="s"
        notification={projectRouting === PROJECT_ROUTING.ORIGIN ? 1 : undefined}
        notificationColor="success"
        css={styles.button}
      >
        <EuiIcon type={CPSIcon} />
      </EuiHeaderSectionItemButton>
    </EuiToolTip>
  );
};

export const ProjectPicker = ({
  projectRouting,
  onProjectRoutingChange,
  fetchProjects,
  isReadonly = false,
  readonlyTitle,
}: ProjectPickerProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const styles = useMemoCss(projectPickerStyles);
  const { isTourOpen, closeTour } = useProjectPickerTour();

  const { originProject, linkedProjects } = useFetchProjects(fetchProjects);

  // do not render the component if originProject is not loaded yet
  if (!originProject) {
    return null;
  }

  return (
    <EuiTourStep
      isStepOpen={isTourOpen}
      title={strings.getProjectPickerTourTitle()}
      content={strings.getProjectPickerTourContent()}
      onFinish={closeTour}
      step={1}
      stepsTotal={1}
      anchorPosition="downLeft"
      minWidth={300}
      maxWidth={360}
      repositionOnScroll
      offset={2}
      footerAction={
        <EuiButton
          size="s"
          color="success"
          onClick={closeTour}
          data-test-subj="project-picker-tour-close-button"
        >
          {strings.getProjectPickerTourCloseButton()}
        </EuiButton>
      }
      panelProps={{
        'data-test-subj': 'project-picker-tour',
      }}
    >
      <EuiPopover
        button={
          <ProjectPickerButton
            projectRouting={projectRouting}
            linkedProjectsCount={linkedProjects.length}
            onClick={() => setShowPopover(!showPopover)}
          />
        }
        isOpen={showPopover}
        closePopover={() => setShowPopover(false)}
        repositionOnScroll
        anchorPosition="downLeft"
        ownFocus
        panelPaddingSize="none"
        panelProps={{ css: styles.popover }}
      >
        <ProjectPickerContent
          projectRouting={projectRouting}
          onProjectRoutingChange={onProjectRoutingChange}
          fetchProjects={fetchProjects}
          isReadonly={isReadonly}
          readonlyTitle={readonlyTitle}
        />
      </EuiPopover>
    </EuiTourStep>
  );
};

export const DisabledProjectPicker = () => {
  const styles = useMemoCss(projectPickerStyles);
  return (
    <EuiToolTip content={strings.getProjectPickerDisabledTooltip()}>
      <EuiButtonIcon
        css={styles.disabledButton}
        aria-label={strings.getProjectPickerButtonAriaLabel()}
        data-test-subj="project-picker-button"
        size="xs"
        isDisabled
        display="fill"
        iconType={CPSIconDisabled}
      />
    </EuiToolTip>
  );
};

const projectPickerStyles = {
  popover: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.base * 35,
    }),
  disabledButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.s,
    }),
  button: ({ euiTheme }: UseEuiTheme) =>
    css({
      svg: {
        verticalAlign: 'middle',
      },
      '.euiNotificationBadge': {
        insetInlineEnd: `-${euiTheme.size.s}`,
      },
    }),
  lensButtonWrapper: () =>
    css({
      position: 'relative',
      display: 'inline-block',
    }),
  overrideBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      right: 0,
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: euiTheme.colors.success,
      border: `2px solid #FFFFFF`,
      pointerEvents: 'none',
    }),
};
