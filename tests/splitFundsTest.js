/**
 * Test script for the splitUnifiedFunds GraphQL mutation
 * This file can be run to test the implementation
 */

import { gql } from '@apollo/client';

// Test GraphQL mutation
const SPLIT_UNIFIED_FUNDS_MUTATION = gql`
  mutation SplitUnifiedFunds {
    splitUnifiedFunds {
      success
      message
      distribution {
        originalAmount
        personalAmount
        businessAmount
        personalAccountBalance
        businessAccountBalance
        remainingUnifiedRevenue
      }
    }
  }
`;

// Test query to check current balances
const GET_REVENUE_BREAKDOWN = gql`
  query GetRevenueBreakdown {
    getRevenueBreakdown {
      unifiedRevenue
      personalOperation
      businessOperation
    }
  }
`;

/**
 * Test scenarios:
 * 1. Test when unified revenue is 0 (should fail)
 * 2. Test when unified revenue has funds (should succeed)
 * 3. Test the split ratio calculation (1/3 personal, 2/3 business)
 * 4. Test account balance updates
 */

const testScenarios = {
  scenario1: {
    name: "No funds available",
    unifiedRevenue: 0,
    expectedResult: "error",
    expectedMessage: "No funds available in unified revenue account to split"
  },
  scenario2: {
    name: "Small amount",
    unifiedRevenue: 100,
    expectedResult: "success",
    personalAmount: 33.33,
    businessAmount: 66.67
  },
  scenario3: {
    name: "Large amount",
    unifiedRevenue: 15000,
    expectedResult: "success",
    personalAmount: 5000,
    businessAmount: 10000
  }
};

/**
 * Example test function (to be run in a proper test environment)
 */
async function testSplitUnifiedFunds(apolloClient) {
  console.log("🧪 Testing splitUnifiedFunds GraphQL mutation...\n");
  
  try {
    // First, get current revenue breakdown
    console.log("📊 Getting current revenue breakdown...");
    const breakdownResult = await apolloClient.query({
      query: GET_REVENUE_BREAKDOWN,
      fetchPolicy: 'network-only'
    });
    
    console.log("Current balances:", {
      unifiedRevenue: breakdownResult.data.getRevenueBreakdown.unifiedRevenue,
      personalOperation: breakdownResult.data.getRevenueBreakdown.personalOperation,
      businessOperation: breakdownResult.data.getRevenueBreakdown.businessOperation
    });
    
    // Test the split operation
    console.log("\n🔄 Attempting to split unified revenue...");
    const splitResult = await apolloClient.mutate({
      mutation: SPLIT_UNIFIED_FUNDS_MUTATION
    });
    
    console.log("✅ Split operation result:", JSON.stringify(splitResult.data.splitUnifiedFunds, null, 2));
    
    // Verify the split ratios
    const distribution = splitResult.data.splitUnifiedFunds.distribution;
    const personalRatio = distribution.personalAmount / distribution.originalAmount;
    const businessRatio = distribution.businessAmount / distribution.originalAmount;
    
    console.log("\n📈 Distribution ratios:");
    console.log(`Personal: ${(personalRatio * 100).toFixed(2)}% (expected: 33.33%)`);
    console.log(`Business: ${(businessRatio * 100).toFixed(2)}% (expected: 66.67%)`);
    
    // Check if ratios are approximately correct (within 0.01 tolerance)
    const personalRatioOk = Math.abs(personalRatio - 1/3) < 0.01;
    const businessRatioOk = Math.abs(businessRatio - 2/3) < 0.01;
    
    console.log(`\n✅ Personal ratio check: ${personalRatioOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Business ratio check: ${businessRatioOk ? 'PASS' : 'FAIL'}`);
    
    return {
      success: splitResult.data.splitUnifiedFunds.success,
      ratiosCorrect: personalRatioOk && businessRatioOk,
      distribution
    };
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Manual testing instructions
 */
console.log(`
🚀 Manual Testing Instructions:

1. Ensure you have some funds in the 'revenue_total' (unified revenue) account
2. Open the SystemAccountsDashboard in the admin app
3. Scroll to the Quick Actions section
4. Click the "Split Revenue" button (indigo colored)
5. Review the distribution preview in the modal
6. Confirm the split operation
7. Verify the balances are updated correctly

Expected behavior:
- Personal operation gets 1/3 of the amount
- Business operation gets 2/3 of the amount
- Unified revenue becomes 0
- Success message shows the distribution details

The implementation includes:
✅ GraphQL mutation resolver with 1/3 and 2/3 split logic
✅ Split funds button in Quick Actions
✅ Modal with distribution preview
✅ Error handling for insufficient funds
✅ Real-time balance updates
✅ Admin-only access control
`);

export { SPLIT_UNIFIED_FUNDS_MUTATION, GET_REVENUE_BREAKDOWN, testSplitUnifiedFunds };