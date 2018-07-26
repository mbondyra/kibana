import React from 'react';
import { EuiText } from '@elastic/eui';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';

const DemodataDatasource = () => (
  <EuiText>
    <h3>You are using demo data</h3>
    <p>
      This data source is connected to every Canvas element by default. Its purpose is to give you
      some playground data to get started. The demo set contains 4 strings, 3 numbers and a date.
      Feel free to experiment and, when you're ready, click the <strong>Change Datasource</strong>{' '}
      link below to connect to your own data.
    </p>
  </EuiText>
);

export const demodata = () => ({
  name: 'demodata',
  displayName: 'Demo Data',
  help: 'Mock data set with with usernames, prices, projects, countries and phases.',
  // Replace this with a better icon when we have time.
  image: 'logoElasticStack',
  template: templateFromReactComponent(DemodataDatasource),
});
