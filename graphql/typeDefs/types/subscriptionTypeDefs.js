// src/graphql/typeDefs/subscriptionTypeDefs.js
import { gql } from "graphql-tag";

const subscriptionTypeDefs = gql`
  type Subscription {
    ping: String!
  }
`;

export default subscriptionTypeDefs;
