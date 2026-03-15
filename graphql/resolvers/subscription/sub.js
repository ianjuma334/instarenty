import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

export default {
  Subscription: {
    messageSent: {
      subscribe: () => pubsub.asyncIterator(['MESSAGE_SENT']),
    },
  },
  Mutation: {
    sendMessage: (_, { text }) => {
      pubsub.publish('MESSAGE_SENT', { messageSent: text });
      return text;
    },
  },
};
