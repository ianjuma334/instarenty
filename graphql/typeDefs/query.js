import { gql } from 'graphql-tag';

export default gql`
  type Query {

    # ====================== USER QUERIES ======================

    fees: Fees
    getUserBalance(userId: ID!): Float!
    getUserEarnings(userId: ID!): UserEarnings!
    users: [User]
    user(id: ID!): User
    approvedLandlords(after: ID, limit: Int): UserConnection!
    allTenants(after: ID, limit: Int): UserConnection!
    allWorkers(after: ID, limit: Int): UserConnection!
    allCustomerCare(after: ID, limit: Int): UserConnection!
    allAssistantAdmin(after: ID, limit: Int): UserConnection!
    freezedTenants(after: ID, limit: Int): UserConnection!
    freezedWorkers(after: ID, limit: Int): UserConnection!
    freezedCustomerCare(after: ID, limit: Int): UserConnection!
    freezedAssistantAdmin(after: ID, limit: Int): UserConnection!
    freezedTenantsByMe(after: ID, limit: Int): UserConnection!
    freezedLandlordsByMe(after: ID, limit: Int): UserConnection!
    freezedWorkersByMe(after: ID, limit: Int): UserConnection!
    freezedCustomerCareByMe(after: ID, limit: Int): UserConnection!
    freezedAssistantAdminByMe(after: ID, limit: Int): UserConnection!
    flaggedTenants(after: ID, limit: Int): UserConnection!
    pendingLandlordsWithActivatedAccounts(after: ID, limit: Int): UserConnection!
    pendingLandlordsWithInActiveAccounts(after: ID, limit: Int): UserConnection!
    approvals: [Approval]!
    approval(id: ID!): Approval
    frozenAccountsByFreezer(freezerId: String!, after: ID, limit: Int): UserConnection!
    allFrozenAccounts(after: ID, limit: Int): UserConnection!
    flaggedLandlords(after: ID, limit: Int): UserConnection!
    getMyProfile: User!
    validateSignup(username: String!, email: String!): ValidationResult!
    getStaffSalaryPreview: StaffSalaryPreview!
    #getUserTransactions: [Transaction!]!
    approvedLandlordsWithApprover: [LandlordApprover]!
    adminFilterUsers(filters: AdminUserFilterInput): AdminUserFilterResult!
    searchUsersByUsername(username: String!, after: ID, limit: Int): UserConnection!

    # ====================== USER MANAGEMENT STATS ======================
    getUserManagementStats: UserManagementStats!
    approvedLandlordsCount: Int!
    pendingLandlordsCount: Int!
    flaggedLandlordsCount: Int!
    totalTenantsCount: Int!
    frozenTenantsCount: Int!
    totalCustomerCareCount: Int!
    totalAssistantAdminsCount: Int!
    totalWorkersCount: Int!

  # ====================== POST QUERIES ======================

  #         ============== POST USER QUERIES ==============  

    institutions: [Institution]
    institutionByName(name: String!): Institution
    amenities: [Amenity!]!
    post(id: ID!): Post
    userPosts(userId: ID!,after:ID, limit: Int): PostConnection!
    myFavorites(first: Int, after: ID): PostConnection!
    myBookings(first: Int, after: ID): PostConnection!
    bookingsByPost(postId: ID!, first: Int, after: ID): BookingConnection!
    reviews(postId: ID!, after: ID, limit: Int): ReviewConnection
    myReaction(postId: ID!): UserReaction
    featuredPosts(first: Int, after: ID): PostConnection!
    getNotifications: [Notification!]!
    
    #         ============== POST GENERAL QUERIES ==============  
    posts(first: Int, after: String): PostConnection
    getFilteredPosts(filters: FiltersInput!, first: Int , after: ID): PostConnection!

    #         ============== ADMIN POST QUERIES ============== 
    pendingApprovalPosts(after: ID, limit: Int): PostConnection!
    pendingConfirmationPosts(after: ID, limit: Int): PostConnection!
    grabbedPendingConfirmationPosts(after: ID, limit: Int): PostConnection!
    noPhotosPosts(after: ID, limit: Int): PostConnection!
    
    approvedPosts(first: Int, after: ID): PostConnection!


  # ====================== TRANSACTION QUERIES ===============

    #getAllTransactions: [Transaction!]!
    #getTransactionById(id: ID!): Transaction

# ====================== REPORT QUERIES ======================

getDashboardStats: DashboardStats!
getReports: Report
getReportById(id: ID!): Report
getReportsByReporter(reporterId: ID!): [Report]
getReportsByReported(reportedId: ID!): [Report]

    # ====================== SYSTEM ACCOUNT QUERIES ======================
    getSystemAccounts: [SystemAccount]
    getSystemAccount(type: String!): SystemAccount!
    getAccountDiscrepancy: AccountDiscrepancy
    getUserBalancesByRole: UserBalancesSummary!
    getRevenueBreakdown: RevenueBreakdown!
    getMoneyFlow(after: ID, limit: Int, filters: MoneyFlowFilterInput): MoneyFlowConnection!
    getMoneyFlowSummary(period: String): MoneyFlowSummary!
  }
  extend type Query {
  getUserTransactions(after: ID, limit: Int, filters: TransactionFilterInput): TransactionConnection!
  getAllTransactions(after: ID, limit: Int, filters: TransactionFilterInput): TransactionConnection!
}

input TransactionFilterInput {
  type: String
  status: String
  paymentMethod: String
  fromDate: String
  toDate: String
}

input MoneyFlowFilterInput {
  type: String
  category: String
  userId: ID
  fromDate: String
  toDate: String
}
`;
