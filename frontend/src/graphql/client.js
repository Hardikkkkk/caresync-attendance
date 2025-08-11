import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://caresync-backend-7867.onrender.com/',
  cache: new InMemoryCache(),
});

export default client;
