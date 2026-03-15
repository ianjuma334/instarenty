import gql from "graphql-tag";

export default gql`
  type UserWithApprover {
    user: User!
    approvedBy: User
  }

  type LandlordApprover {
    landlordId: ID!
    approvedBy: ID
    approvedByUser: User
  }
`;