import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const AuthPage = () => {
  const { loginWithRedirect, isLoading, error } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Healthcare icon SVG */}
        <div style={styles.iconWrapper} aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            fill="#4a90e2"
            viewBox="0 0 24 24"
          >
            <path d="M12 2c1.1 0 2 .9 2 2v6h6c1.1 0 2 .9 2 2s-.9 2-2 2h-6v6c0 1.1-.9 2-2 2s-2-.9-2-2v-6H4c-1.1 0-2-.9-2-2s.9-2 2-2h6V4c0-1.1.9-2 2-2z" />
          </svg>
        </div>

        <h2 style={styles.title}>Welcome to CareSync</h2>
        <p style={styles.subtitle}>
          Please login or sign up to continue.
        </p>

        {error && <p style={styles.error}>{error.message}</p>}

        <button
          onClick={handleLogin}
          style={isLoading ? {...styles.loginButton, ...styles.loginButtonDisabled} : styles.loginButton}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Login / Signup'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background:
      `radial-gradient(circle at center, #e6f0fa, #c7dbf8), 
       url('https://images.unsplash.com/photo-1588776814546-24df998bcb0f?auto=format&fit=crop&w=1470&q=80')`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '1rem',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '3rem 2.5rem',
    borderRadius: '16px',
    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '360px',
  },
  iconWrapper: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    color: '#205081',
  },
  subtitle: {
    fontSize: '1.1rem',
    marginBottom: '2.5rem',
    color: '#555d66',
  },
  error: {
    color: '#d9534f',
    marginBottom: '1rem',
    fontWeight: '600',
  },
  loginButton: {
    padding: '14px 24px',
    fontSize: '1.15rem',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#205081',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
    width: '100%',
    boxShadow: '0 6px 12px rgba(32, 80, 129, 0.4)',
  },
  loginButtonDisabled: {
    backgroundColor: '#7f9cbf',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

export default AuthPage;
