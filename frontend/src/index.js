import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { ApolloProvider } from '@apollo/client';
import client from './graphql/client';

import { Grommet } from 'grommet';
import 'antd/dist/reset.css';
import './index.css';
import { Auth0Provider } from '@auth0/auth0-react';
import { LanguageProvider } from './i18n/LanguageContext';

const domain = 'dev-ngnpvc0padsjdq7n.us.auth0.com';
const clientId = 'hlUGeS9Vpq8eEQPp0mqCGWc1x5bdS5hr';

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
    domain={domain}
    clientId={clientId}
    // Keep the session across page refreshes (default is in-memory only)
    cacheLocation="localstorage"
    // Renew the session with a refresh token instead of a hidden iframe,
    // which browsers often block. Falls back to the iframe if it fails.
    useRefreshTokens
    useRefreshTokensFallback
    authorizationParams={{
      redirect_uri: window.location.origin,
      scope: 'openid profile email offline_access',
    }}
  >
    <ApolloProvider client={client}>
      <Grommet theme={theme}>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </Grommet>
    </ApolloProvider>
  </Auth0Provider>
);