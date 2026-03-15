// src/graphql/resolvers/adminResolvers.js
import { User, roles } from '../../../Data/UserDetails.js';
import Transaction from '../../../Data/TransactionDetails.js';
import SystemAccount from '../../../Data/SystemAccountDetails.js';
import MoneyFlow from '../../../Data/MoneyFlowDetails.js';
import Post from '../../../Data/PostDetails.js';
import { paginateResults } from '../../../utils/paginate.js';
import { getFees } from '../../../services/feesService.js';

// ✅ NEW: Helper function to sync revenue to unified account
const syncToUnifiedRevenue = async (category, amount) => {
  const directRevenueCategories = ['booking_fee', 'featured_fee', 'registration_fee'];
  const netRevenueCategories = ['activation_net_revenue', 'other']; // ✅ ADDED: Net revenue categories
  
  if (directRevenueCategories.includes(category) || netRevenueCategories.includes(category)) {
    await SystemAccount.findOneAndUpdate(
      { type: 'revenue_total' },
      { $inc: { balance: amount } },
      { upsert: true, new: true }
    );
  }
};

// --------------------- CONSTANTS ---------------------
const ADMIN_ROLES = ['ADMIN', 'admin', 'ASSISTANT_ADMIN','assistantAdmin', 'CUSTOMER_CARE', 'customerCare'];

// --------------------- HELPERS ---------------------
const checkAdminRoles = async (firebaseUser, allowedRoles = ADMIN_ROLES) => {
  if (!firebaseUser) {
    throw new Error("Unauthorized");
  }

  // Get the MongoDB user to check the role
  const dbUser = await User.findOne({ uid: firebaseUser.uid });
  if (!dbUser || !allowedRoles.includes(dbUser.role)) {
    throw new Error("Unauthorized");
  }

  return dbUser;
};

const paginatedQuery = async ({ model, filter, select, after, limit }) => {
  return paginateResults({ model, filter, select, after, limit });
};

const updateUserRole = async (id, role) => {
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  );
  if (!updatedUser) throw new Error("User not found");
  return updatedUser;
};

const updateUserApproval = async (id, updates) => {
  const updatedUser = await User.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  );
  if (!updatedUser) throw new Error("User not found");
  return updatedUser;
};

// --------------------- RESOLVERS ---------------------
export default {
  Query: {
    // ====================== USER MANAGEMENT STATS ======================
    
    // Comprehensive stats query for admin dashboard
    getUserManagementStats: async (_, __, { user }) => {
      await checkAdminRoles(user);
      try {
        // Execute all count queries in parallel for optimal performance
        const [
          approvedLandlordsCount,
          pendingLandlordsCount,
          pendingLandlordsNotActivatedCount,
          flaggedLandlordsCount,
          totalTenantsCount,
          frozenTenantsCount,
          flaggedTenantsCount,
          totalCustomerCareCount,
          totalAssistantAdminsCount,
          totalWorkersCount
        ] = await Promise.all([
          // Count approved landlords (approved AND activated)
          User.countDocuments({ 
            role: 'landlord', 
            isApproved: true, 
            isActivated: true 
          }),
          
          // Count pending landlords (not approved but activated)
          User.countDocuments({ 
            role: 'landlord', 
            isApproved: false, 
            isActivated: true 
          }),
          
          // Count pending landlords (not approved and not activated)
          User.countDocuments({ 
            role: 'landlord', 
            isApproved: false, 
            isActivated: false 
          }),
          
          // Count flagged landlords
          User.countDocuments({ 
            role: 'landlord', 
            isFlagged: true 
          }),
          
          // Count all tenants
          User.countDocuments({ role: 'tenant' }),
          
          // Count frozen tenants
          User.countDocuments({ 
            role: 'tenant', 
            freeze: true 
          }),
          
          // Count flagged tenants
          User.countDocuments({ 
            role: 'tenant', 
            isFlagged: true 
          }),
          
          // Count customer care agents
          User.countDocuments({ role: 'customerCare' }),
          
          // Count assistant admins
          User.countDocuments({ role: 'assistantAdmin' }),
          
          // Count workers
          User.countDocuments({ role: 'worker' })
        ]);

        const result = {
          approvedLandlordsCount,
          pendingLandlordsCount,
          pendingLandlordsNotActivatedCount,
          flaggedLandlordsCount,
          totalTenantsCount,
          frozenTenantsCount,
          flaggedTenantsCount,
          totalCustomerCareCount,
          totalAssistantAdminsCount,
          totalWorkersCount
        };

        return result;
      } catch (error) {
        console.error('Failed to fetch user management statistics:', error);
        throw new Error('Failed to fetch user management statistics');
      }
    },

    // Individual count queries for granular control
    approvedLandlordsCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ 
        role: 'landlord', 
        isApproved: true, 
        isActivated: true 
      });
      return count;
    },

    pendingLandlordsCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ 
        role: 'landlord', 
        isApproved: false, 
        isActivated: true 
      });
      return count;
    },

    flaggedLandlordsCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ 
        role: 'landlord', 
        isFlagged: true 
      });
      return count;
    },

    totalTenantsCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ role: 'tenant' });
      return count;
    },

    frozenTenantsCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ 
        role: 'tenant', 
        freeze: true 
      });
      return count;
    },

    totalCustomerCareCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ role: 'customerCare' });
      return count;
    },

    totalAssistantAdminsCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ role: 'assistantAdmin' });
      return count;
    },

    totalWorkersCount: async (_, __, { user }) => {
      await checkAdminRoles(user);
      const count = await User.countDocuments({ role: 'worker' });
      return count;
    },
    flaggedTenants: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'tenant', freeze: false },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedCustomerCareByMe: async (_, { after, limit = 10 }, { user }) => {
      const dbUser = await checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'customerCare', freeze: true, freezerId: dbUser._id },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedAssistantAdminByMe: async (_, { after, limit = 10 }, { user }) => {
      const dbUser = await checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'assistantAdmin', freeze: true, freezerId: dbUser._id },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedWorkersByMe: async (_, { after, limit = 10 }, { user }) => {
      const dbUser = await checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'worker', freeze: true, freezerId: dbUser._id },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedLandlordsByMe: async (_, { after, limit = 10 }, { user }) => {
      const dbUser = await checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'landlord', freeze: true, freezerId: dbUser._id },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedTenantsByMe: async (_, { after, limit = 10 }, { user }) => {
      const dbUser = await checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'tenant', freeze: true, freezerId: dbUser._id },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedWorkers: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'worker', freeze: true },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedCustomerCare: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'customerCare', freeze: true },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedAssistantAdmin: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'assistantAdmin', freeze: true },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    freezedTenants: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'tenant', freeze: true },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    allAssistantAdmin: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'assistantAdmin' },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role monthlySalary lastSalaryPayment',
        after,
        limit
      });
    },
    allCustomerCare: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'customerCare' },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role monthlySalary lastSalaryPayment',
        after,
        limit
      });
    },
    allWorkers: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'worker' },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role monthlySalary lastSalaryPayment',
        after,
        limit
      });
    },
    allTenants: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { role: 'tenant' },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },
    approvedLandlords: async (_, { after, limit = 10 }, { user }) => {
      await checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { isApproved: true, role: 'landlord', approvedBy: { $ne: null } },
        select: '_id fname lname county subcounty ward image isApproved approvedBy username role',
        after,
        limit
      });
    },

    pendingLandlordsWithActivatedAccounts: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { isApproved: false, role: 'landlord', isActivated: true },
        select: '_id fname lname isApproved isActivated county subcounty ward approvedBy username role',
        after,
        limit
      });
    },

    pendingLandlordsWithInActiveAccounts: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { isApproved: false, role: 'landlord', isActivated: false },
        select: '_id fname lname isApproved isActivated county subcounty ward approvedBy username role',
        after,
        limit
      });
    },

    flaggedLandlords: async (_, { after, limit = 10 }, { user }) => {
      checkAdminRoles(user);
      return paginatedQuery({
        model: User,
        filter: { isFlagged: true, role: 'landlord' },
        select: '_id fname lname isApproved approvedBy county subcounty ward  username role',
        after,
        limit
      });
    },

    frozenAccountsByFreezer: async (_, { freezerId, after, limit = 10 }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      // Get the MongoDB user to check the role
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) throw new Error('User not found');

      // Permission check
      if (dbUser.role === 'admin') {
        // admin sees all
      } else if (['assistantAdmin','customerCare'].includes(dbUser.role)) {
        if (dbUser._id.toString() !== freezerId) throw new Error('Cannot fetch frozen accounts of others');
      } else {
        throw new Error('No permission to fetch frozen accounts');
      }

      return paginatedQuery({
        model: User,
        filter: { freezerId },
        select: '_id fname lname username county subcounty ward  role freeze freezerId',
        after,
        limit
      });
    },

    allFrozenAccounts: async (_, { after, limit = 10 }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      // Get the MongoDB user to check the role
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) throw new Error('User not found');

      let filter = { freeze: true };

      if (dbUser.role === 'assistantAdmin') {
        filter.role = { $in: ['landlord','tenant','worker'] };
      } else if (dbUser.role === 'customerCare') {
        throw new Error('Customer Care cannot fetch all frozen accounts');
      }

      return paginatedQuery({
        model: User,
        filter,
        select: '_id fname lname username county subcounty ward  role freeze',
        after,
        limit
      });
    }
  },

  Mutation: {
    deleteUser: async (_, { id }, { user }) => {
      checkAdminRoles(user);
      const targetUser = await User.findById(id);
      if (!targetUser) return { success: false, message: "User not found" };
      await User.findByIdAndDelete(id);
      return { success: true, message: "User deleted successfully" };
    },

    promoteUserToWorker: async (_, { id }, { user }) => {
      checkAdminRoles(user);
      const updatedUser = await updateUserRole(id, roles.WORKER);
      return { success: true, message: "User promoted successfully", user: updatedUser };
    },

    promoteUserToCustomerCare: async (_, { id }, { user }) => {
      checkAdminRoles(user);
      const updatedUser = await updateUserRole(id, roles.CUSTOMER_CARE);
      return { success: true, message: "User promoted successfully", user: updatedUser };
    },

    promoteUserToAssistantAdmin: async (_, { id }, { user }) => {
      checkAdminRoles(user);
      const updatedUser = await updateUserRole(id, roles.ASSISTANT_ADMIN);
      return { success: true, message: "User promoted successfully", user: updatedUser };
    },

    demoteUserToTenant: async (_, { id }, { user }) => {
      checkAdminRoles(user);
      const updatedUser = await updateUserRole(id, roles.TENANT);
      return { success: true, message: "User demoted successfully", user: updatedUser };
    },

    demoteUserToLandlord: async (_, { id }, { user }) => {
      checkAdminRoles(user);
      const updatedUser = await updateUserRole(id, roles.LANDLORD);
      return { success: true, message: "User demoted successfully", user: updatedUser };
    },

    approveLandlord: async (_, { id }, { user }) => {
      const dbUser = await checkAdminRoles(user);
      const targetUser = await User.findById(id);
      const fees = getFees();

      if (!targetUser) return { success: false, message: "Landlord not found", user: null };
      if (!targetUser.isActivated) return { success: false, message: "Landlord has not activated account yet", user: null };
      if (targetUser.isApproved) return { success: false, message: "Landlord already approved", user: targetUser };

      // Approve landlord
      const updatedUser = await updateUserApproval(id, { isApproved: true, approvedBy: dbUser._id });

      const activationFee = fees.activationFee;
      const customerCarePayment = Math.round((activationFee * fees.customerCarePercentage) / 100);
      const wasReferred = !!targetUser.referredBy;
      const referralAmount = wasReferred ? Math.round((activationFee * fees.referralBonus) / 100) : 0;
      const netRevenue = activationFee - customerCarePayment - referralAmount;

      // 1️⃣ Customer care allocation
      if (customerCarePayment > 0) {
        dbUser.accountBalance += customerCarePayment;
        dbUser.totalEarnings += customerCarePayment;
        await dbUser.save();

        await Transaction.create({
          userId: dbUser._id,
          type: 'credit',
          amount: customerCarePayment,
          balanceAfter: dbUser.accountBalance,
          status: 'completed',
          paymentMethod: 'wallet',
          purpose: `Customer care approval fee for landlord ${targetUser._id}`,
          approvedBy: dbUser._id,
        });

        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_customercare_allocated' },
          { $inc: { balance: customerCarePayment } },
          { upsert: true, new: true }
        );

        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_activation_holding' },
          { $inc: { balance: -customerCarePayment } },
          { upsert: true }
        );

        await MoneyFlow.create({
          type: 'expense',
          category: 'customer_care_payment',
          amount: customerCarePayment,
          description: `Customer care payment for approving landlord ${targetUser._id}`,
          userId: dbUser._id,
        });
      }

      // 2️⃣ Net revenue allocation
      if (netRevenue > 0) {
        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_net' },
          { $inc: { balance: netRevenue } },
          { upsert: true, new: true }
        );

        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_activation_holding' },
          { $inc: { balance: -netRevenue } },
          { upsert: true }
        );

        await MoneyFlow.create({
          type: 'income',
          category: 'activation_net_revenue',
          amount: activationFee,
          description: `Income from landlord ${targetUser._id} activation approval`,
          userId: targetUser._id,
        });

        // ✅ NEW: Sync realized revenue to unified account
        await syncToUnifiedRevenue('activation_net_revenue', netRevenue);
      }

      // 3️⃣ Referral allocation
      if (wasReferred && referralAmount > 0) {
        const referrer = await User.findById(targetUser.referredBy);
        if (referrer) {
          referrer.accountBalance += referralAmount;
          await referrer.save();

          await Transaction.create({
            userId: referrer._id,
            type: 'credit',
            amount: referralAmount,
            balanceAfter: referrer.accountBalance,
            status: 'completed',
            paymentMethod: 'wallet',
            purpose: `Referral bonus for referring landlord ${targetUser.fname} ${targetUser.lname}`,
          });

          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_referrer_allocated' },
            { $inc: { balance: referralAmount } },
            { upsert: true, new: true }
          );

          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_referral_holding' },
            { $inc: { balance: -referralAmount } },
            { upsert: true }
          );

          await MoneyFlow.create({
            type: 'expense',
            category: 'referrer_payment',
            amount: referralAmount,
            description: `Referral bonus payment to ${referrer._id} for referring ${targetUser._id}`,
            userId: referrer._id,
          });
        }
      }

      return { success: true, message: "Landlord approved successfully", user: updatedUser };
    },


    freezeAccount: async (_, { userId, note }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // Get the MongoDB user to check the role
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) throw new Error("User not found");

      const targetUser = await User.findById(userId);
      if (!targetUser) throw new Error("Target user not found");
      if (targetUser.freeze) throw new Error("Account is already frozen");

      // Role-based restriction
      if (dbUser.role === 'assistantAdmin' && ['admin','assistantAdmin'].includes(targetUser.role))
        throw new Error('Cannot freeze this account');
      if (dbUser.role === 'customerCare' && !['landlord','tenant','worker'].includes(targetUser.role))
        throw new Error('Cannot freeze this account');

      await User.findByIdAndUpdate(userId, { freeze: true, freezerId: dbUser._id, freezeNote: note });
      return { success: true, message: "Account frozen successfully" };
    },

    unfreezeAccount: async (_, { userId }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // Get the MongoDB user to check the role
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) throw new Error("User not found");

      const targetUser = await User.findById(userId);
      if (!targetUser) throw new Error("Target user not found");
      if (!targetUser.freeze) throw new Error("Account is not frozen");

      if (dbUser.role === 'assistantAdmin' && !['landlord','tenant','worker'].includes(targetUser.role))
        throw new Error('Cannot unfreeze this account');

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { isFlagged: false, reportCount: 0, reportedBy: [], freeze: false, freezerId: null, freezeNote: null },
        { new: true }
      );
      return { success: true, message: "Account unfrozen successfully", user: updatedUser };
    },

    unflagAccount: async (_, { userId }, { user }) => {
      checkAdminRoles(user);
      const targetUser = await User.findById(userId);
      if (!targetUser) return { success: false, message: "User not found" };
      if (!targetUser.isFlagged) return { success: false, message: "User is not flagged" };

      targetUser.isFlagged = false;
      targetUser.reportCount = 0;
      targetUser.reportedBy = [];
      await targetUser.save();

      await Post.updateMany({ userId }, { $set: { isFlagged: false } });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { freeze: false, freezerId: null, freezeNote: null },
        { new: true }
      );

      return { success: true, message: "Account unflagged successfully", user: updatedUser };
    }
  }
};
