import { gql } from 'graphql-tag';

export default gql`
  extend type Mutation {
    # ====================== SYSTEM ACCOUNT MUTATIONS ======================
    updateSystemAccount(type: String!, balance: Float!, description: String): SystemAccountResponse!
    adjustSystemAccount(type: String!, amount: Float!, description: String): SystemAccountResponse!
    depositSystemAccount(type: String!, amount: Float!, description: String): SystemAccountResponse!
    initializeSystemAccounts: [SystemAccount]!
    
    # ====================== PROFIT DISTRIBUTION MUTATIONS ======================
    distributeOwnerProfit: ProfitDistributionResponse!
    splitUnifiedFunds: SplitFundsResponse!
  }

  type ProfitDistributionResponse {
    success: Boolean!
    message: String!
    distribution: ProfitDistribution
  }

  type ProfitDistribution {
    originalAmount: Float!
    personalAmount: Float!
    businessAmount: Float!
    personalAccountBalance: Float!
    businessAccountBalance: Float!
    remainingUnifiedRevenue: Float!
  }

  type ProfitDistributionPreview {
    currentUnifiedRevenue: Float!
    personalAmount: Float!
    businessAmount: Float!
    personalAccountBalance: Float!
    businessAccountBalance: Float!
    distributionRatio: DistributionRatio!
  }

  type DistributionRatio {
    personal: Float!
    business: Float!
  }

  type SplitFundsResponse {
    success: Boolean!
    message: String!
    distribution: FundDistribution!
  }

  type FundDistribution {
    originalAmount: Float!
    personalAmount: Float!
    businessAmount: Float!
    personalAccountBalance: Float!
    businessAccountBalance: Float!
    remainingUnifiedRevenue: Float!
  }
`;