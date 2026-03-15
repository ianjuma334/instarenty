import { User, roles } from '../../../Data/UserDetails.js';
import  Transaction  from '../../../Data/TransactionDetails.js';


const ADMIN_ROLES = ['ADMIN', 'admin', 'ASSISTANT_ADMIN','assistantAdmin', 'CUSTOMER_CARE', 'customerCare'];
const USER_ROLES = ['LANDLORD', 'landlord', 'TENANT', 'tenant', 'WORKER', 'worker'];

const transactionResolvers = {
  Transaction: {
    createdAt: (parent) => parent.createdAt?.toISOString() || null,
    updatedAt: (parent) => parent.updatedAt?.toISOString() || null,
  },
  Query: {
    getUserTransactions: async (_, { after, limit = 10, filters }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // Get the MongoDB user to get the correct user ID
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) throw new Error("User not found");

      // Always scoped to logged-in user
      const query = { userId: dbUser._id };

      // 🔎 Apply filters safely
      if (filters) {
        if (filters.type) query.type = filters.type;
        if (filters.status) query.status = filters.status;
        if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

        if (filters.fromDate || filters.toDate) {
          query.createdAt = {};
          if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
          if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
        }
      }

      // Cursor-based pagination
      if (after) query._id = { $lt: after };

      const transactions = await Transaction.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1);

      const hasNextPage = transactions.length > limit;
      const edges = transactions.slice(0, limit).map(tx => ({
        node: tx,
        cursor: tx._id.toString(),
      }));

      // Strictly count only this user's filtered transactions
      const totalCount = await Transaction.countDocuments(query);

      return {
        edges,
        pageInfo: {
          endCursor: edges.length ? edges[edges.length - 1].cursor : null,
          hasNextPage,
        },
        totalCount,
      };
    },


    getAllTransactions: async (_, { after, limit = 10, filters }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // Get the MongoDB user to check the role
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
        throw new Error("Forbidden");
      }

      const query = {};

      // 🔎 Apply filters
      if (filters) {
        if (filters.type) query.type = filters.type;
        if (filters.status) query.status = filters.status;
        if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
        if (filters.fromDate || filters.toDate) {
          query.createdAt = {};
          if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
          if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
        }
      }

      if (after) query._id = { $lt: after };

      const transactions = await Transaction.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1);

      const hasNextPage = transactions.length > limit;
      const edges = transactions.slice(0, limit).map(tx => ({
        node: tx,
        cursor: tx._id.toString(),
      }));

      const totalCount = await Transaction.countDocuments(query);

      return {
        edges,
        pageInfo: {
          endCursor: edges.length ? edges[edges.length - 1].cursor : null,
          hasNextPage,
        },
        totalCount,
      };
    },
  },
  Mutation: {
    requestWithdrawal: async (_, { amount }, { user }) => {
        if (!user) throw new Error("Unauthorized");

        // Get the MongoDB user
        const dbUser = await User.findOne({ uid: user.uid });
        if (!dbUser) throw new Error("User not found");

        // Check if user has enough balance
        if (dbUser.accountBalance < amount || amount <= 0) {
          return {
            success: false,
            message: 'Insufficient balance for withdrawal',
            transaction: null
          };
        }

        // Deduct the amount
        dbUser.accountBalance -= amount;
        await dbUser.save();

        // Log the withdrawal request (pending status)
        const transaction = new Transaction({
          userId: dbUser._id,
          type: 'withdrawal',
          amount,
          status: 'pending',
          paymentMethod: 'mpesa',  // Or other methods
          purpose: 'User withdrawal request',
          balanceAfter: dbUser.accountBalance
        });

        await transaction.save();

        return {
          success: true,
          message: 'Withdrawal request submitted and is pending approval',
          transaction
        };
      },
      
    requestTopUp: async (_, { amount }, { user }) => {
        if (!user) throw new Error("Unauthorized");

        // Get the MongoDB user
        const dbUser = await User.findOne({ uid: user.uid });
        if (!dbUser) throw new Error("User not found");

        // Update the balance
        dbUser.accountBalance += amount;  // Add the top-up amount to the user balance
        await dbUser.save();

        // Log the top-up transaction
        const transaction = new Transaction({
          userId: dbUser._id,
          type: 'topup',
          amount,
          balanceAfter: dbUser.accountBalance,
          status: 'completed',
          paymentMethod: 'mpesa',  // Adjust if you're using other methods
          purpose: 'User top-up request'
        });

        await transaction.save();
        return {
          success: true,
          message: 'Top-up request completed',
          transaction
        };
      },
  },
};

export default transactionResolvers;
