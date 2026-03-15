// src/graphql/resolvers/subscription/subResolvers.js
import pubsub from "../../pubsub.js";

const PING_TOPIC = "PING_TOPIC";

const subResolvers = {
  Subscription: {
    ping: {
      subscribe: () => {
        if (!pubsub) {
          throw new Error("PubSub not available - Redis connection required for subscriptions");
        }
        console.log("🚀 Subscribing to PING_TOPIC");
        return pubsub.asyncIterator([PING_TOPIC]);
      },
    },
  },
};

export { PING_TOPIC };
export default subResolvers;
