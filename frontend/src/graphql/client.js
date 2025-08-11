import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://caresync-frontend-0m6a.onrender.com',
  cache: new InMemoryCache(),
});

export default client;
