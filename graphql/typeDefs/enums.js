import { gql } from 'graphql-tag';

export default gql`
  enum TransactionType {
    topup
    withdrawal
    booking
    activation
    referral
    refund
  }

  enum TransactionStatus {
    pending
    completed
    failed
  }

  enum PaymentMethod {
    mpesa
    wallet
  }
`;
