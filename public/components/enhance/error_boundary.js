import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { omit } from 'lodash';
import { withState, withHandlers, lifecycle, mapProps, compose } from 'recompose';

export const errorBoundaryHoc = compose(
  withState('error', 'setError', null),
  withState('errorInfo', 'setErrorInfo', null),
  withHandlers({
    resetErrorState: ({ setError, setErrorInfo }) => () => {
      setError(null);
      setErrorInfo(null);
    },
  }),
  lifecycle({
    componentDidCatch(error, errorInfo) {
      this.props.setError(error);
      this.props.setErrorInfo(errorInfo);
    },
  }),
  mapProps(props => omit(props, ['setError', 'setErrorInfo']))
);

const ErrorBoundaryComponent = props => (
  <Fragment>
    {props.children({
      error: props.error,
      errorInfo: props.errorInfo,
      resetErrorState: props.resetErrorState,
    })}
  </Fragment>
);

ErrorBoundaryComponent.propTypes = {
  children: PropTypes.func.isRequired,
  error: PropTypes.object,
  errorInfo: PropTypes.object,
  resetErrorState: PropTypes.func.isRequired,
};

export const ErrorBoundary = errorBoundaryHoc(ErrorBoundaryComponent);
