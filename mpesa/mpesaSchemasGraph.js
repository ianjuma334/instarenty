// schema.js
import { gql } from "apollo-server-express";

export const typeDefs = gql`
type PaymentStatus {
  CheckoutRequestID: String!
  ResultCode: Int!
  ResultDesc: String!
  Amount: Float
  MpesaReceiptNumber: String
}

type Mutation {
  initiateStkPush(
    amount: Int!
    phone: String!
    account: String!
    desc: String
  ): StkPushResponse!
  triggerTestPayment: PaymentStatus!
}

type Subscription {
  paymentReceived(checkoutRequestID: String!): PaymentStatus!
  balanceUpdated(userId: ID!): BalanceUpdatePayload!
  testPayment: PaymentStatus!
}

type StkPushResponse {
  MerchantRequestID: String!
  CheckoutRequestID: String!
  ResponseCode: String!
  ResponseDescription: String!
  CustomerMessage: String
}

type BalanceUpdatePayload {
  userId: ID!
  newBalance: Float!
}

`;
