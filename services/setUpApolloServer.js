// src/services/setupApolloServer.js
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { graphqlUploadExpress } from "graphql-upload";

import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";

import { getRedis } from "./setUpRedis.js";
import typeDefs from "../graphql/typeDefs/index.js";
import resolvers from "../graphql/resolvers/resolvers.js";
import authenticate from "../middleware/auth.js";
import { formatGraphQLError } from "../middleware/errorHandler.js";
import config from "../config/index.js";

import pubsub from "../graphql/pubsub.js"; // ✅ still available for your own resolvers

const setupApolloServer = async (app, httpServer) => {

  // ✅ Build schema once for both HTTP and WS
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // 1️⃣ Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  // 2️⃣ Hook graphql-ws into the WS server
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const token = ctx.connectionParams?.authorization || null;
        const user = token
          ? await authenticate({ headers: { authorization: token } })
          : null;
        return { user, redis: getRedis() };
      },
    },
    wsServer
  );

  // 3️⃣ Create Apollo Server (HTTP only; WS is separate) - HIGH PERFORMANCE
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    // ⚡ Performance optimizations
    introspection: config.isDevelopment(),
    formatError: formatGraphQLError,
    // ⚡ Enable query result caching
    persistedQueries: {
      cache: new Map(),
      ttl: 900, // 15 minutes cache
    },
    // ⚡ Enable response caching
    cache: 'bounded',
    // ⚡ Reduce response size
    includeStacktraceInErrorResponses: false,
    // ⚡ Optimize for production
    stopOnTerminationSignals: false,
    // ⚡ Parse optimization
    parseOptions: {
      maxTokens: 10000, // Limit query complexity
    },
  });

  await apolloServer.start();

  // 👇 Enable file uploads
  app.use(
    graphqlUploadExpress({
      maxFileSize: config.upload.maxFileSize,
      maxFiles: config.upload.maxFiles,
    })
  );

  // 👇 GraphQL HTTP endpoint
  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const user = await authenticate(req);
        return { user, redis: getRedis(), req };
      },
    })
  );

  // ✅ Removed ping interval
  // ⚡ Subscriptions are now handled dynamically via your schema resolvers

  return apolloServer;
};

export default setupApolloServer;
