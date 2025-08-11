import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { ApolloProvider } from '@apollo/client';
import client from './graphql/client';

import { Grommet } from 'grommet';
import 'antd/dist/reset.css';

import { Auth0Provider } from '@auth0/auth0-react';

const domain = "YOUR_AUTH0_DOMAIN";
const clientId = "YOUR_AUTH0_CLIENT_ID";

const theme = {
  global: {
    font: {
      family: 'Roboto',
      size: '16px',
    },
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Auth0Provider
    domain={'dev-ngnpvc0padsjdq7n.us.auth0.com'}
    clientId={'hlUGeS9Vpq8eEQPp0mqCGWc1x5bdS5hr'}
    authorizationParams={{
      redirect_uri: window.location.origin,
    }}
  >
    <ApolloProvider client={client}>
      <Grommet theme={theme} full>
        <App />
      </Grommet>
    </ApolloProvider>
  </Auth0Provider>
);
