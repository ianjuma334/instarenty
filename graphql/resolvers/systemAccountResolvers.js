import SystemAccount from '../../Data/SystemAccountDetails.js';
import { User } from '../../Data/UserDetails.js';

// --- Helper to ensure user is admin ---
const ensureAdmin = async (user) => {
  if (!user) throw new Error("Forbidden: Admin access required");
  const dbUser = await User.findOne({ uid: user.uid });
  if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
    throw new Error("Forbidden: Admin access required");
  }
  return dbUser;
};

// --- List of all system account types ---
const REQUIRED_ACCOUNTS = [
  'operational',
  'working',
  'revenue',
  'expenses',
  'expenses_total',           // Total operational expenses
  'expenses_staff_salaries',
  'revenue_post_holding',
  'revenue_activation_holding',
  'revenue_renewal_holding',
  'revenue_referral_holding',
  'revenue_feature',
  'revenue_booking',
  'revenue_total',            // ✅ NEW: Unified revenue account
  'revenue_worker_allocated',
  'revenue_worker_pending',
  'revenue_customercare_allocated',
  'revenue_referrer_allocated',
  'revenue_net',
  // System operation accounts
  'personal_operation',
  'business_operation'
];

const systemAccountResolvers = {
  Query: {
    // --- Fetch all system accounts ---
    getSystemAccounts: async (_, __, { user }) => {
      const dbUser = await ensureAdmin(user);

      // Ensure all accounts exist
      const accounts = [];
      for (const type of REQUIRED_ACCOUNTS) {
        let account = await SystemAccount.findOne({ type });
        if (!account) {
          account = new SystemAccount({
            type,
            balance: 0,
            updatedBy: dbUser._id,
            description: 'Auto-initialized'
          });
          await account.save();
        }
        accounts.push(account);
      }

      await SystemAccount.populate(accounts, { path: 'updatedBy', select: 'fname lname username' });
      return accounts;
    },

    // --- Fetch a single account by type ---
    getSystemAccount: async (_, { type }, { user }) => {
      await ensureAdmin(user);

      const account = await SystemAccount.findOne({ type }).populate('updatedBy', 'fname lname username');
      if (!account) throw new Error(`System account '${type}' not found`);
      return account;
    },

    // --- Check operational vs working account discrepancy ---
    getAccountDiscrepancy: async (_, __, { user }) => {
      await ensureAdmin(user);

      const [operational, working] = await Promise.all([
        SystemAccount.findOne({ type: 'operational' }),
        SystemAccount.findOne({ type: 'working' })
      ]);

      const operationalBalance = operational?.balance || 0;
      const workingBalance = working?.balance || 0;
      const discrepancy = workingBalance - operationalBalance;

      return {
        operationalBalance,
        workingBalance,
        discrepancy,
        needsFunding: discrepancy < 0,
        fundingNeeded: Math.abs(discrepancy)
      };
    },

    // --- Aggregate balances by user role ---
    getUserBalancesByRole: async (_, __, { user }) => {
      await ensureAdmin(user);

      const roles = ['worker', 'landlord', 'tenant', 'customerCare', 'assistantAdmin'];
      const balances = {};

      await Promise.all(
        roles.map(async role => {
          const result = await User.aggregate([
            { $match: { role: { $in: [role, role.charAt(0).toUpperCase() + role.slice(1)] } } },
            { $group: { _id: null, total: { $sum: '$accountBalance' } } }
          ]);
          balances[role] = result[0]?.total || 0;
        })
      );

      // Map to the correct field names expected by the GraphQL schema
      const userBalances = {
        workers: balances.worker || 0,
        landlords: balances.landlord || 0,
        tenants: balances.tenant || 0,
        customerCare: balances.customerCare || 0,
        assistantAdmins: balances.assistantAdmin || 0,
        total: Object.values(balances).reduce((a, b) => a + b, 0)
      };

      return userBalances;
    },

    // --- Revenue breakdown ---
    getRevenueBreakdown: async (_, __, { user }) => {
      await ensureAdmin(user);

      // Fetch all system accounts to get complete picture
      const allAccounts = await SystemAccount.find({
        type: { $in: REQUIRED_ACCOUNTS }
      });

      const findBalance = (type) => allAccounts.find(acc => acc.type === type)?.balance || 0;

      const holdingAccounts = {
        postHolding: findBalance('revenue_post_holding'),
        activationHolding: findBalance('revenue_activation_holding'),
        renewalHolding: findBalance('revenue_renewal_holding'),
        referralHolding: findBalance('revenue_referral_holding')
      };

      const directRevenue = {
        feature: findBalance('revenue_feature'),
        booking: findBalance('revenue_booking')
      };

      const allocatedRevenue = {
        worker: findBalance('revenue_worker_allocated'),
        customerCare: findBalance('revenue_customercare_allocated'),
        referrer: findBalance('revenue_referrer_allocated')
      };

      const netRevenue = findBalance('revenue_net');
      const totalExpenses = findBalance('expenses_total');
      const unifiedRevenue = findBalance('revenue_total');  // ✅ NEW: Unified revenue
      const grossRevenue = Object.values(directRevenue).reduce((a, b) => a + b, 0) + netRevenue;
      const trueNetRevenue = grossRevenue - totalExpenses;

      return {
        holdingAccounts: { ...holdingAccounts, total: Object.values(holdingAccounts).reduce((a, b) => a + b, 0) },
        directRevenue: { ...directRevenue, total: Object.values(directRevenue).reduce((a, b) => a + b, 0) },
        allocatedRevenue: { ...allocatedRevenue, total: Object.values(allocatedRevenue).reduce((a, b) => a + b, 0) },
        unifiedRevenue,  // ✅ NEW: Unified revenue account
        personalOperation: findBalance('personal_operation'),  // NEW: Personal operation account
        businessOperation: findBalance('business_operation'),  // NEW: Business operation account
        netRevenue,
        totalExpenses,
        grossRevenue,
        totalRevenue: trueNetRevenue,  // This is the actual profit after all expenses
        trueNetRevenue
      };
    }
  },

  Mutation: {
    // --- Update account directly ---
    updateSystemAccount: async (_, { type, balance, description }, { user }) => {
      const dbUser = await ensureAdmin(user);

      const account = await SystemAccount.findOneAndUpdate(
        { type },
        { balance, lastUpdated: new Date(), updatedBy: dbUser._id, description },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).populate('updatedBy', 'fname lname username');

      return {
        success: true,
        message: `System account '${type}' updated successfully`,
        account
      };
    },

    // --- Adjust account by amount ---
    adjustSystemAccount: async (_, { type, amount, description }, { user }) => {
      const dbUser = await ensureAdmin(user);

      const account = await SystemAccount.findOne({ type });
      if (!account) throw new Error(`System account '${type}' not found`);

      const newBalance = account.balance + amount;
      if (newBalance < 0) throw new Error(`Insufficient funds in ${type} account`);

      account.balance = newBalance;
      account.lastUpdated = new Date();
      account.updatedBy = dbUser._id;
      account.description = description || `Adjustment by ${dbUser.fname} ${dbUser.lname}`;
      await account.save();
      await account.populate('updatedBy', 'fname lname username');

      return {
        success: true,
        message: `System account '${type}' adjusted by ${amount > 0 ? '+' : ''}${amount}`,
        account
      };
    },

    // --- Deposit money to account ---
    depositSystemAccount: async (_, { type, amount, description }, { user }) => {
      const dbUser = await ensureAdmin(user);
      if (amount <= 0) throw new Error("Deposit amount must be positive");

      const account = await SystemAccount.findOne({ type });
      if (!account) throw new Error(`System account '${type}' not found`);

      account.balance += amount;
      account.lastUpdated = new Date();
      account.updatedBy = dbUser._id;
      account.description = description || `Deposit by ${dbUser.fname} ${dbUser.lname}`;
      await account.save();
      await account.populate('updatedBy', 'fname lname username');

      return {
        success: true,
        message: `Successfully deposited ${amount} to ${type} account`,
        account
      };
    },

    // --- Initialize all system accounts ---
    initializeSystemAccounts: async (_, __, { user }) => {
      const dbUser = await ensureAdmin(user);

      const accounts = [];
      for (const type of REQUIRED_ACCOUNTS) {
        let account = await SystemAccount.findOne({ type });
        if (!account) {
          account = new SystemAccount({
            type,
            balance: 0,
            updatedBy: dbUser._id,
            description: 'System initialization'
          });
          await account.save();
        }
        accounts.push(account);
      }

      await SystemAccount.populate(accounts, { path: 'updatedBy', select: 'fname lname username' });
      return accounts;
    },

    // --- Split unified revenue between personal and business operations (1/3 and 2/3) ---
    splitUnifiedFunds: async (_, __, { user }) => {
      const dbUser = await ensureAdmin(user);

      // Get the unified revenue account or create it if it doesn't exist
      let unifiedRevenueAccount = await SystemAccount.findOne({ type: 'revenue_total' });
      if (!unifiedRevenueAccount) {
        unifiedRevenueAccount = new SystemAccount({
          type: 'revenue_total',
          balance: 0,
          updatedBy: dbUser._id,
          description: 'Auto-created unified revenue account'
        });
        await unifiedRevenueAccount.save();
      }

      const availableAmount = unifiedRevenueAccount.balance;
      if (availableAmount <= 0) {
        throw new Error('No funds available in unified revenue account to split');
      }

      // Calculate split amounts: 1/3 personal, 2/3 business
      const personalAmount = Math.floor(availableAmount * (1/3) * 100) / 100; // Round to 2 decimal places
      const businessAmount = availableAmount - personalAmount; // Ensure exact total

      // Get destination accounts, create them if they don't exist
      let personalAccount = await SystemAccount.findOne({ type: 'personal_operation' });
      let businessAccount = await SystemAccount.findOne({ type: 'business_operation' });

      // Create personal operation account if it doesn't exist
      if (!personalAccount) {
        personalAccount = new SystemAccount({
          type: 'personal_operation',
          balance: 0,
          updatedBy: dbUser._id,
          description: 'Auto-created personal operation account'
        });
        await personalAccount.save();
      }

      // Create business operation account if it doesn't exist
      if (!businessAccount) {
        businessAccount = new SystemAccount({
          type: 'business_operation',
          balance: 0,
          updatedBy: dbUser._id,
          description: 'Auto-created business operation account'
        });
        await businessAccount.save();
      }

      // Start a transaction-like operation
      try {
        // Deduct from unified revenue
        unifiedRevenueAccount.balance -= availableAmount;
        unifiedRevenueAccount.lastUpdated = new Date();
        unifiedRevenueAccount.updatedBy = dbUser._id;
        unifiedRevenueAccount.description = `Split distribution: ${personalAmount} to personal, ${businessAmount} to business by ${dbUser.fname} ${dbUser.lname}`;
        await unifiedRevenueAccount.save();

        // Add to personal operation account
        personalAccount.balance += personalAmount;
        personalAccount.lastUpdated = new Date();
        personalAccount.updatedBy = dbUser._id;
        personalAccount.description = `Distribution from unified revenue (1/3) by ${dbUser.fname} ${dbUser.lname}`;
        await personalAccount.save();

        // Add to business operation account
        businessAccount.balance += businessAmount;
        businessAccount.lastUpdated = new Date();
        businessAccount.updatedBy = dbUser._id;
        businessAccount.description = `Distribution from unified revenue (2/3) by ${dbUser.fname} ${dbUser.lname}`;
        await businessAccount.save();

        // Populate the updated accounts
        await Promise.all([
          unifiedRevenueAccount.populate('updatedBy', 'fname lname username'),
          personalAccount.populate('updatedBy', 'fname lname username'),
          businessAccount.populate('updatedBy', 'fname lname username')
        ]);

        const distribution = {
          originalAmount: availableAmount,
          personalAmount,
          businessAmount,
          personalAccountBalance: personalAccount.balance,
          businessAccountBalance: businessAccount.balance,
          remainingUnifiedRevenue: unifiedRevenueAccount.balance
        };

        return {
          success: true,
          message: `Successfully split KES ${availableAmount.toLocaleString()}: KES ${personalAmount.toLocaleString()} to personal operation, KES ${businessAmount.toLocaleString()} to business operation`,
          distribution
        };
      } catch (error) {
        throw new Error(`Failed to split funds: ${error.message}`);
      }
    }
  }
};

export default systemAccountResolvers;
