import gql from "graphql-tag";

export default gql`
  type User {
    _id: ID!
    uid: String
    fname: String!
    lname: String!
    username: String!
    email: String!
    phone: String!
    gender: String
    account: String
    county: String
    subcounty: String
    ward: String
    image: String
    role: String
    accountBalance: Float
    monthlySalary: Float
    lastSalaryPayment: String
    referredBy: String
    referralCode: String
    isApproved: Boolean
    approvedBy: String
    reportedBy: [User!]!
    reportCount: Int
    isFlagged: Boolean
    freeze: Boolean
    freezerId: String
    freezeNote: String
    isActivated: Boolean
    createdAt: String
    updatedAt: String
  }

type Approval {
    id: ID!
    landlord: ID
    approvedBy: ID
    approvalDate: String
    status: String
    notes: String
  }

type Notification {
    id: ID!
    userId: ID!
    senderId: ID
    type: String!
    message: String!
    link: String
    isRead: Boolean
}

  type Transaction {
    id: ID!
    userId: ID!
    postId: ID
    type: String!
    amount: Int!
    balanceAfter: Int
    status: String!
    paymentMethod: String!
    purpose: String
    approvedBy: ID
    createdAt: String!
    updatedAt: String!
  }

    type Report {
    id: ID!
    reporter: User!
    reported: User!
    reason: String!
    status: String!
    handledBy: User
    solutionNote: String
    createdAt: String!
    updatedAt: String!
  }

  type UserConnection {
  edges: [UserEdge]
  pageInfo: PageInfo
  }

  type UserEdge {
    node: User
    cursor: String
  }

  type AdminUserFilterResult {
    users: [User]!
    totalCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

type PageInfo {
  endCursor: String
  hasNextPage: Boolean!
}

type TransactionConnection {
  edges: [TransactionEdge]
  pageInfo: PageInfo!
  totalCount: Int!
}

type TransactionEdge {
  node: Transaction
  cursor: String
}

type Fees {
  activationFee: Int
  postRenewalFee: Int
  featurePostFee: Int
  bookingFee: Int
  referralBonus: Int
  postUploadFee: Int
  workerPercentage: Float
  customerCarePercentage: Float
}

type SystemAccount {
  id: ID!
  type: String!
  balance: Float!
  lastUpdated: String!
  updatedBy: User
  description: String
}

type AccountDiscrepancy {
  operationalBalance: Float!
  workingBalance: Float!
  discrepancy: Float!
  needsFunding: Boolean!
  fundingNeeded: Float!
}

type SystemAccountResponse {
  success: Boolean!
  message: String!
  account: SystemAccount
}

type UserBalancesSummary {
workers: Float!
landlords: Float!
tenants: Float!
customerCare: Float!
assistantAdmins: Float!
total: Float!
}

type UserEarnings {
  pendingEarnings: Float!
  totalEarnings: Float!
  monthlySalary: Float
}

type CreatePostResponse {
  success: Boolean!
  message: String!
  post: Post
  needsDeposit: Boolean
  shortfall: Float
}

type RevenueHoldingBreakdown {
  postHolding: Float!
  activationHolding: Float!
  renewalHolding: Float!
  referralHolding: Float!
  total: Float!
}

type RevenueDirectBreakdown {
  feature: Float!
  booking: Float!
  total: Float!
}

type RevenueAllocatedBreakdown {
  worker: Float!
  customerCare: Float!
  referrer: Float!
  total: Float!
}

type RevenueBreakdown {
  holdingAccounts: RevenueHoldingBreakdown!
  directRevenue: RevenueDirectBreakdown!
  allocatedRevenue: RevenueAllocatedBreakdown!
  unifiedRevenue: Float!       # ✅ NEW: Unified revenue account (includes all revenue)
  personalOperation: Float!    # NEW: Personal operation account
  businessOperation: Float!    # NEW: Business operation account
  netRevenue: Float!           # Revenue after allocations
  totalExpenses: Float!        # Total operational expenses
  grossRevenue: Float!         # Net Revenue + Direct Revenue (before expenses)
  totalRevenue: Float!         # True profit after all expenses
  trueNetRevenue: Float!       # Same as totalRevenue (actual profit)
}

type UserManagementStats {
  approvedLandlordsCount: Int!
  pendingLandlordsCount: Int!
  pendingLandlordsNotActivatedCount: Int!
  flaggedLandlordsCount: Int!
  totalTenantsCount: Int!
  frozenTenantsCount: Int!
  flaggedTenantsCount: Int!
  totalCustomerCareCount: Int!
  totalAssistantAdminsCount: Int!
  totalWorkersCount: Int!
}
`;
