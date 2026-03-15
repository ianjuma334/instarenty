import { gql } from 'graphql-tag';

export default gql`
  # Custom scalar type
  scalar Upload

  type Mutation {
  uploadProfilePicture(file: Upload!): String!
}
type MpesaPaymentResponse {
    success: Boolean!
    message: String!
    merchantRequestID: String
    checkoutRequestID: String
    customerMessage: String
  }

  type Query {
    testMpesaAuth: String! # <-- NEW for testing if you get access token
  }

  type Mutation {
    initiateMpesaPayment(phoneNumber: String!, amount: Int!): MpesaPaymentResponse!
  }
  extend type Mutation {
  registerMpesaUrls: MpesaRegisterResponse!
}

type MpesaRegisterResponse {
  success: Boolean!
  message: String!
}


`;




