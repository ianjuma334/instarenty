import http from 'http';
import setupExpress from './setUpExpress.js';
import setupApolloServer from './setUpApolloServer.js';
import setupSocketIo from './setUpSocketIo.js';

const initializeServer = async (PORT, HOST) => {
  const app = setupExpress();
  const httpServer = http.createServer(app);

  // Apollo mounts its own /graphql in setupApolloServer
  await setupApolloServer(app, httpServer);

  // Socket.io shares the same HTTP server, no conflict
  setupSocketIo(httpServer);

  await new Promise((resolve) => httpServer.listen(PORT, HOST, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  console.log(`📡 Socket.io ready at ws://localhost:${PORT}`);
};

export default initializeServer;
