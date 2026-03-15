import pubsub from "../../pubsub.js";

const MESSAGE_ADDED = "MESSAGE_ADDED";

let messages = []; // simple in-memory store for demo

const messageResolvers = {
  Query: {
    messages: () => messages,
  },
  Mutation: {
    addMessage: async (_, { text }) => {
      const newMessage = { id: Date.now().toString(), text };
      messages.push(newMessage);

      // publish event for subscribers
      if (pubsub) {
        await pubsub.publish(MESSAGE_ADDED, { messageAdded: newMessage });
      }

      return newMessage;
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: () => {
        if (!pubsub) {
          throw new Error("PubSub not available - Redis connection required for subscriptions");
        }
        return pubsub.asyncIterator(MESSAGE_ADDED);
      },
    },
    testPayment: {
      subscribe: () => {
        if (!pubsub) {
          throw new Error("PubSub not available - Redis connection required for subscriptions");
        }
        console.log("📡 Subscribed to testPayment");
        return pubsub.asyncIterator("TEST_PAYMENT");
      },
    },
  },
};

export default messageResolvers;
