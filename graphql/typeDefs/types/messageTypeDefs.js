import { gql } from "apollo-server-express";

const messageTypeDefs = gql`
  type Message {
    id: ID!
    text: String!
  }

  type Query {
    messages: [Message!]!
  }

  type Mutation {
    addMessage(text: String!): Message!
  }

  type Subscription {
    messageAdded: Message!
  }
  
`;

export default messageTypeDefs;
