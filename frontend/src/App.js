import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Careworker from './pages/Careworker';
import ManagerDashboard from './pages/ManagerDashboard';
import AuthPage from './components/AuthPage';  // new AuthPage component
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { GET_USER_BY_EMAIL } from './graphql/queries';
import AuthButtons from './components/AuthButtons';

const CREATE_USER_IF_NOT_EXISTS = gql`
  mutation CreateUserIfNotExists($name: String!, $email: String!) {
    createUserIfNotExists(name: $name, email: $email) {
      id
      name
      email
      role
    }
  }
`;

function App() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [createUserIfNotExists] = useMutation(CREATE_USER_IF_NOT_EXISTS);
  const [hasCreatedUser, setHasCreatedUser] = useState(false);

  // Create user in backend immediately after login/signup
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.email || hasCreatedUser) return;

    const name = user.name || user.nickname || user.email;

    createUserIfNotExists({ variables: { name, email: user.email } })
      .then(() => {
        console.log("✅ User created in backend");
        setHasCreatedUser(true);
        Navigate('/dashboard');
      })
      .catch((err) => console.error("❌ User creation error:", err));
  }, [isLoading, isAuthenticated, user, hasCreatedUser, createUserIfNotExists]);

  const { data: userData, loading: userDataLoading } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: user?.email },
    skip: !user?.email,
    fetchPolicy: "network-only" // ensures fresh data after creation
  });

  if (isLoading || userDataLoading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Show the new custom login/signup page here
    return <AuthPage />;
  }

  const loggedInUser = userData?.getUserByEmail;

  if (!loggedInUser) {
    return (
      <div style={{ padding: 20 }}>
        Creating your account... please wait.
      </div>
    );
  }

  console.log("Fetched user from backend:", loggedInUser);

  return (
    <Router>
      <AuthButtons />
      <div style={{ padding: 16 }}>
        <Link to="/">Home</Link>{' '}
        {loggedInUser.role === 'manager' && (
          <Link to="/manager" style={{ marginLeft: '1rem' }}>
            Manager Dashboard
          </Link>
        )}
      </div>

      <Routes>
        <Route path="/" element={<Careworker user={loggedInUser} />} />
        <Route
          path="/manager"
          element={
            loggedInUser.role === 'manager'
              ? <ManagerDashboard user={loggedInUser} />
              : <Navigate to="/" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
