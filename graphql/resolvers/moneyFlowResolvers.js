import { User } from '../../Data/UserDetails.js';
import MoneyFlow from '../../Data/MoneyFlowDetails.js';
import SystemAccount from '../../Data/SystemAccountDetails.js';
import { categoryToAccountMap } from '../../utils/financialMapping.js';

// ✅ NEW: Helper function to sync direct revenue to unified account
const syncToUnifiedRevenue = async (category, amount) => {
  const directRevenueCategories = ['booking_fee', 'featured_fee', 'registration_fee'];
  const netRevenueCategories = ['activation_net_revenue', 'other', 'post_net_revenue']; // ✅ ADDED: Net revenue categories
  
  if (directRevenueCategories.includes(category) || netRevenueCategories.includes(category)) {
    await SystemAccount.findOneAndUpdate(
      { type: 'revenue_total' },
      { $inc: { balance: amount } },
      { upsert: true, new: true }
    );
  }
};

const moneyFlowResolvers = {
  Query: {
    getMoneyFlow: async (_, { after, limit = 20, filters }, { user }) => {
      console.log("User model:", User);

      if (!user) throw new Error("Forbidden: Admin access required");

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role))
        throw new Error("Forbidden: Admin access required");

      const query = {};

      if (filters) {
        if (filters.type) query.type = filters.type;
        if (filters.category) query.category = filters.category;
        if (filters.userId) query.userId = filters.userId;
        if (filters.fromDate || filters.toDate) {
          query.createdAt = {};
          if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
          if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
        }
      }

      if (after) query._id = { $lt: after };

      const moneyFlows = await MoneyFlow.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate('userId', 'fname lname username')
        .populate('postId', 'county type');

      const hasNextPage = moneyFlows.length > limit;
      const edges = moneyFlows.slice(0, limit).map(flow => ({
        node: flow,
        cursor: flow._id.toString(),
      }));

      const totalCount = await MoneyFlow.countDocuments(query);

      return {
        edges,
        pageInfo: {
          endCursor: edges.length ? edges[edges.length - 1].cursor : null,
          hasNextPage,
        },
        totalCount,
      };
    },

    getMoneyFlowSummary: async (_, { period = 'month' }, { user }) => {
      if (!user) throw new Error("Forbidden: Admin access required");

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role))
        throw new Error("Forbidden: Admin access required");

      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Aggregation pipelines
      const incomePipeline = [
        { $match: { type: 'income', createdAt: { $gte: startDate } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ];

      const expensePipeline = [
        { $match: { type: 'expense', createdAt: { $gte: startDate } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ];

      const liabilityPipeline = [
        { $match: { type: 'liability', createdAt: { $gte: startDate } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ];

      const [incomeResult, expenseResult, liabilityResult] = await Promise.all([
        MoneyFlow.aggregate(incomePipeline),
        MoneyFlow.aggregate(expensePipeline),
        MoneyFlow.aggregate(liabilityPipeline)
      ]);

      // Income summary
      const income = {
        bookingFees: 0,
        featuredFees: 0,
        registrationFees: 0,
        postNetRevenue: 0, // ✅ ADDED: Post net revenue (after expenses)
        other: 0,
        total: 0
      };
      incomeResult.forEach(item => {
        switch (item._id) {
          case 'booking_fee': income.bookingFees = item.total; break;
          case 'featured_fee': income.featuredFees = item.total; break;
          case 'registration_fee': income.registrationFees = item.total; break;
          case 'post_net_revenue': income.postNetRevenue = item.total; break;
          default: income.other += item.total;
        }
        income.total += item.total;
      });

      // Expense summary
      const expenses = {
        referrerPayments: 0,
        workerPayments: 0,
        customerCarePayments: 0,
        staffSalaryPayments: 0,
        refunds: 0,
        other: 0,
        total: 0
      };
      expenseResult.forEach(item => {
        switch (item._id) {
          case 'referrer_payment': expenses.referrerPayments = item.total; break;
          case 'worker_payment': expenses.workerPayments = item.total; break;
          case 'customer_care_payment': expenses.customerCarePayments = item.total; break;
          case 'staff_salary': expenses.staffSalaryPayments = item.total; break;
          case 'refund': expenses.refunds = item.total; break;
          
          // Map new user-friendly expense categories to existing summary fields
          case 'Office Supplies': expenses.other += item.total; break;
          case 'Utilities': expenses.other += item.total; break;
          case 'Marketing': expenses.other += item.total; break;
          case 'Equipment': expenses.other += item.total; break;
          case 'Travel': expenses.other += item.total; break;
          case 'Legal': expenses.other += item.total; break;
          case 'Insurance': expenses.other += item.total; break;
          case 'Maintenance': expenses.other += item.total; break;
          
          default: expenses.other += item.total;
        }
        expenses.total += item.total;
      });

      // Liability summary
      const liabilities = {
        deposits: 0,
        withdrawals: 0,
        netLiabilityChange: 0
      };
      liabilityResult.forEach(item => {
        switch (item._id) {
          case 'deposit': liabilities.deposits = item.total; break;
          case 'withdrawal': liabilities.withdrawals = item.total; break;
        }
      });
      liabilities.netLiabilityChange = liabilities.deposits - liabilities.withdrawals;

      const netProfit = income.total - expenses.total;

      return {
        period,
        startDate,
        endDate: now,
        income,
        expenses,
        liabilities,
        netProfit,
        totalTransactions: incomeResult.length + expenseResult.length + liabilityResult.length
      };
    }
  },

  Mutation: {
    recordExpense: async (_, { input }, { user }) => {
      if (!user) throw new Error("Forbidden: Admin access required");

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role))
        throw new Error("Forbidden: Admin access required");

      try {
        // Create expense record in MoneyFlow collection with type "expense"
        const expense = new MoneyFlow({
          type: 'expense',
          category: input.category,
          amount: input.amount,
          description: input.description,
          metadata: {
            recordedBy: user.id,
            recordedAt: new Date(),
          }
        });

        await expense.save();
        
        // Update SystemAccount balances using financial mapping
        const targetAccount = categoryToAccountMap[input.category] || 'revenue_total';
        
        // ✅ FIXED: Properly deduct expenses (negative amount)
        await SystemAccount.findOneAndUpdate(
          { type: targetAccount },
          { $inc: { balance: -input.amount } },
          { upsert: true, new: true }
        );

        // ✅ FIXED: Don't sync individual expenses to unified revenue (follow landlord activation pattern)
        // Only net revenue should sync to unified revenue, not individual expenses

        await expense.populate('userId', 'fname lname username');

        return {
          success: true,
          message: 'Expense recorded successfully',
          expense: {
            id: expense._id,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
            userId: expense.userId,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt
          }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to record expense: ${error.message}`,
          expense: null
        };
      }
    },

    recordMoneyFlow: async (_, { input }, { user }) => {
      if (!user) throw new Error("Forbidden: Admin access required");

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role))
        throw new Error("Forbidden: Admin access required");

      // Determine type automatically
      const type = (() => {
        switch (input.category) {
          case 'deposit':
          case 'withdrawal': return 'liability';
          case 'booking_fee':
          case 'featured_fee':
          case 'registration_fee': return 'income';
          case 'referrer_payment':
          case 'worker_payment':
          case 'staff_salary':
          case 'refund':
          case 'software':
          case 'other': return 'expense';
          default: return 'expense';
        }
      })();

      const moneyFlow = new MoneyFlow({
        ...input,
        type,
        metadata: {
          recordedBy: user.id,
          recordedAt: new Date(),
          ...input.metadata
        }
      });

      await moneyFlow.save();
      await moneyFlow.populate('userId', 'fname lname username');
      await moneyFlow.populate('postId', 'type');

      // ✅ NEW: Sync direct revenue to unified account
      if (moneyFlow.type === 'income') {
        await syncToUnifiedRevenue(moneyFlow.category, moneyFlow.amount);
      }

      return {
        success: true,
        message: 'Money flow recorded successfully',
        moneyFlow
      };
    }
  },

  Expense: {
    userId: async (expense) => {
      if (!expense.userId) return null;
      return await User.findById(expense.userId);
    }
  }
};

export default moneyFlowResolvers;
