// src/components/AuthButtons.js
import React from 'react';
import { Button, Space } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';

function AuthButtons() {
  const { loginWithRedirect, logout, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return null;

  return (
    <Space style={{ position: 'absolute', top: 16, right: 16 }}>
      {!isAuthenticated ? (
        <>
          <Button type="primary" onClick={() => loginWithRedirect()}>
            Log In
          </Button>
          <Button onClick={() => loginWithRedirect({ screen_hint: 'signup' })}>
            Sign Up
          </Button>
        </>
      ) : (
        <Button danger onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          Log Out
        </Button>
      )}
    </Space>
  );
}

export default AuthButtons;
