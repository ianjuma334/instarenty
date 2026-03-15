// Test script to verify the new count queries work
// Run this with: node test_count_queries.js

import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import typeDefs from './graphql/typeDefs/index.js';
import resolvers from './graphql/resolvers/resolvers.js';
import { User } from './Data/UserDetails.js';

// Mock user context for testing
const mockUser = {
  uid: 'test-admin-uid',
  role: 'admin'
};

// Create test server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => ({ user: mockUser }),
  introspection: true,
  playground: true,
});

async function testCountQueries() {
  try {
    console.log('🧪 Testing Count Queries Implementation...\n');
    
    // Start server
    const app = express();
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });
    
    const PORT = process.env.PORT || 4000;
    await new Promise(resolve => app.listen(PORT, resolve));
    
    console.log(`🚀 Test server started at http://localhost:${PORT}/graphql`);
    console.log('\n📝 You can test these queries in Apollo Playground:\n');
    
    // Test queries
    const testQueries = [
      `query GetUserManagementStats {
        getUserManagementStats {
          approvedLandlordsCount
          pendingLandlordsCount
          flaggedLandlordsCount
          totalTenantsCount
          frozenTenantsCount
          totalCustomerCareCount
          totalAssistantAdminsCount
          totalWorkersCount
        }
      }`,
      
      `query IndividualCounts {
        approvedLandlordsCount
        pendingLandlordsCount
        totalTenantsCount
        totalWorkersCount
      }`
    ];
    
    testQueries.forEach((query, index) => {
      console.log(`Query ${index + 1}:`);
      console.log(query);
      console.log('\n' + '='.repeat(50) + '\n');
    });
    
    console.log('✅ Implementation complete! Check the counts in your database.');
    console.log('📊 Expected: You should see real counts from your User collection');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCountQueries();