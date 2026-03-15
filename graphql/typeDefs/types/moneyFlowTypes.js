import { gql } from 'apollo-server-express';

export default gql`
  # ====================== MONEY FLOW TYPES ======================

  type MoneyFlow {
    id: ID!
    type: String!
    category: String!
    amount: Float!
    description: String!
    userId: User
    postId: Post
    transactionId: Transaction
    metadata: String
    createdAt: String!
    updatedAt: String!
  }

  type MoneyFlowEdge {
    node: MoneyFlow!
    cursor: ID!
  }

  type MoneyFlowConnection {
    edges: [MoneyFlowEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

type MoneyFlowSummary {
  period: String!
  startDate: String!
  endDate: String!

  income: MoneyFlowIncomeSummary!
  expenses: MoneyFlowExpenseSummary!
  liabilities: MoneyFlowLiabilitySummary!

  netProfit: Float!          # income - expenses ONLY
  totalTransactions: Int!
}


  type MoneyFlowIncomeSummary {
    bookingFees: Float!
    featuredFees: Float!
    registrationFees: Float!
    other: Float!
    total: Float!
  }

  type MoneyFlowLiabilitySummary {
  deposits: Float!
  withdrawals: Float!
  netLiabilityChange: Float!
}


  type MoneyFlowExpenseSummary {
    referrerPayments: Float!
    workerPayments: Float!
    customerCarePayments: Float!
    staffSalaryPayments: Float!
    refunds: Float!
    other: Float!
    total: Float!
  }

  input MoneyFlowInput {
    type: String!
    category: String!
    amount: Float!
    description: String!
    userId: ID
    postId: ID
    transactionId: ID
    metadata: String
  }

  input ExpenseInput {
    amount: Float!
    category: String!
    description: String!
  }

  type Expense {
    id: ID!
    amount: Float!
    category: String!
    description: String!
    userId: User
    createdAt: String!
    updatedAt: String!
  }

  type ExpenseMutationResponse {
    success: Boolean!
    message: String!
    expense: Expense
  }
`;