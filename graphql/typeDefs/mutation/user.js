import gql from "graphql-tag";

export default gql`
    type Mutation {
        # ====================== SHORT USER MUTATIONS ======================

        deleteUser(id: ID!): DeleteResponse
        promoteUserToWorker(id: ID!): PromotionResponse
        promoteUserToCustomerCare(id: ID!): PromotionResponse
        promoteUserToAssistantAdmin(id: ID!): PromotionResponse
        demoteUserToTenant(id: ID!): PromotionResponse
        demoteUserToLandlord(id: ID!): PromotionResponse
        freezeAccount(userId: ID!, note: String!): FreezeResponse!
        unfreezeAccount(userId: ID!): UnFreezeResponse!
        unflagAccount(userId: ID!): UnFlagResponse!
        requestWithdrawal(amount: Int!): TransactionResponse!
        requestTopUp(amount: Int!): TransactionResponse!
        activateLandlord: TransactionResponse!
        createReport(input: CreateReportInput!): ReportResponse
        updateReport(id: ID!, input: UpdateReportInput!): ReportResponse
        loginUser: LoginResponse
        updateFees(input: UpdateFeesInput!): Fees

        # ====================== AMENITY MUTATIONS ======================
        createAmenity(input: CreateAmenityInput!): AmenityMutationResponse
        updateAmenity(id: ID!, input: UpdateAmenityInput!): AmenityMutationResponse
        deleteAmenity(id: ID!): DeleteResponse

        # ====================== LONG USER MUTATIONS ======================

    updateUser(
      id: ID!,
      fname: String,
      lname: String,
      username: String,
      email: String,
      phone: String,
      gender: String,
      account: String,
      county: String,
      subcounty: String,
      ward: String
    ): User

    registerUser(
      fname: String!,
      lname: String!,
      username: String!,
      phone: String!,
      gender: String!,
      role: String!,
      county: String!,
      subcounty: String!,
      ward: String!,
      referredBy: String
    ): RegisterResponse

    saveImageUrl(path: String!): SaveImageResponse

    # ====================== MONEY FLOW MUTATIONS ======================
    recordExpense(input: ExpenseInput!): ExpenseMutationResponse!
    recordMoneyFlow(input: MoneyFlowInput!): MoneyFlowMutationResponse!

    # ====================== STAFF SALARY MUTATIONS ======================
    updateStaffSalary(userId: ID!, amount: Float!): UpdateStaffSalaryResponse!
    payStaffSalaries: PayStaffSalariesResponse!

    }
`;