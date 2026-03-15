// Backend Implementation for Efficient Count Queries
// Add this to your GraphQL schema and resolvers

// 1. GRAPHQL SCHEMA (typeDefs.js or schema.js)
const typeDefs = `
  type UserManagementStats {
    approvedLandlordsCount: Int!
    pendingLandlordsCount: Int!
    flaggedLandlordsCount: Int!
    totalTenantsCount: Int!
    frozenTenantsCount: Int!
    totalCustomerCareCount: Int!
    totalAssistantAdminsCount: Int!
    totalWorkersCount: Int!
  }

  type Query {
    getUserManagementStats: UserManagementStats!
    approvedLandlordsCount: Int!
    pendingLandlordsCount: Int!
    flaggedLandlordsCount: Int!
    totalTenantsCount: Int!
    frozenTenantsCount: Int!
    totalCustomerCareCount: Int!
    totalAssistantAdminsCount: Int!
    totalWorkersCount: Int!
  }
`;

// 2. RESOLVERS (resolvers.js)
const resolvers = {
  Query: {
    // Comprehensive stats query
    getUserManagementStats: async (_, __, { user }) => {
      // Check if user has admin permissions
      if (!user || !['admin', 'assistantAdmin'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      try {
        // Get MongoDB collections
        const User = require('./models/User'); // Adjust path to your User model
        
        // Execute all count queries in parallel for better performance
        const [
          approvedLandlordsCount,
          pendingLandlordsCount,
          flaggedLandlordsCount,
          totalTenantsCount,
          frozenTenantsCount,
          totalCustomerCareCount,
          totalAssistantAdminsCount,
          totalWorkersCount
        ] = await Promise.all([
          // Count approved landlords
          User.countDocuments({ 
            role: 'landlord', 
            isApproved: true, 
            isActivated: true 
          }),
          
          // Count pending landlords (approved but not activated OR vice versa)
          User.countDocuments({ 
            role: 'landlord', 
            isApproved: false, 
            isActivated: true 
          }),
          
          // Count flagged landlords
          User.countDocuments({ 
            role: 'landlord', 
            isFlagged: true 
          }),
          
          // Count all tenants
          User.countDocuments({ 
            role: 'tenant' 
          }),
          
          // Count frozen tenants
          User.countDocuments({ 
            role: 'tenant', 
            isFrozen: true 
          }),
          
          // Count customer care agents
          User.countDocuments({ 
            role: 'customerCare' 
          }),
          
          // Count assistant admins
          User.countDocuments({ 
            role: 'assistantAdmin' 
          }),
          
          // Count workers
          User.countDocuments({ 
            role: 'worker' 
          })
        ]);

        return {
          approvedLandlordsCount,
          pendingLandlordsCount,
          flaggedLandlordsCount,
          totalTenantsCount,
          frozenTenantsCount,
          totalCustomerCareCount,
          totalAssistantAdminsCount,
          totalWorkersCount
        };
      } catch (error) {
        console.error('Error fetching user management stats:', error);
        throw new Error('Failed to fetch user management statistics');
      }
    },

    // Individual count queries
    approvedLandlordsCount: async (_, __, { user }) => {
      if (!user || !['admin', 'assistantAdmin'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ 
        role: 'landlord', 
        isApproved: true, 
        isActivated: true 
      });
    },

    pendingLandlordsCount: async (_, __, { user }) => {
      if (!user || !['admin', 'customerCare'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ 
        role: 'landlord', 
        isApproved: false, 
        isActivated: true 
      });
    },

    flaggedLandlordsCount: async (_, __, { user }) => {
      if (!user || !['admin', 'assistantAdmin', 'customerCare'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ 
        role: 'landlord', 
        isFlagged: true 
      });
    },

    totalTenantsCount: async (_, __, { user }) => {
      if (!user || !['admin', 'assistantAdmin', 'customerCare'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ role: 'tenant' });
    },

    frozenTenantsCount: async (_, __, { user }) => {
      if (!user || !['admin', 'assistantAdmin'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ 
        role: 'tenant', 
        isFrozen: true 
      });
    },

    totalCustomerCareCount: async (_, __, { user }) => {
      if (!user || !['admin', 'assistantAdmin'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ role: 'customerCare' });
    },

    totalAssistantAdminsCount: async (_, __, { user }) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ role: 'assistantAdmin' });
    },

    totalWorkersCount: async (_, __, { user }) => {
      if (!user || !['admin', 'assistantAdmin', 'customerCare'].includes(user.role)) {
        throw new Error('Unauthorized');
      }

      const User = require('./models/User');
      return await User.countDocuments({ role: 'worker' });
    }
  }
};

module.exports = {
  typeDefs,
  resolvers
};