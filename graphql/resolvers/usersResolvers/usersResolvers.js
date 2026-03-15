import { User } from '../../../Data/UserDetails.js';
import  Transaction from '../../../Data/TransactionDetails.js';
import SystemAccount from '../../../Data/SystemAccountDetails.js';
import MoneyFlow from '../../../Data/MoneyFlowDetails.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getFees } from '../../../services/feesService.js';
import { validateGraphQLInput, registerUserSchema, loginUserSchema, updateUserSchema } from '../../../middleware/validation.js';
import { cacheQuery, cacheKeys, invalidateEntityCache } from '../../../utils/cache.js';
import { executePaginatedQuery } from '../../../utils/pagination.js';
import config from '../../../config/index.js';
import authenticate from '../../../middleware/auth.js';
dotenv.config();

// ✅ NEW: Helper function to sync revenue to unified account
const syncToUnifiedRevenue = async (category, amount) => {
  const directRevenueCategories = ['booking_fee', 'featured_fee', 'registration_fee'];
  
  if (directRevenueCategories.includes(category)) {
    await SystemAccount.findOneAndUpdate(
      { type: 'revenue_total' },
      { $inc: { balance: amount } },
      { upsert: true, new: true }
    );
  }
};


export default {
  Query: {
users: async (_, { page = 1, limit = 10 }) => {
  try {
    const cacheKey = `users:page:${page}:limit:${limit}`;

    return await cacheQuery(
      cacheKey,
      async () => await executePaginatedQuery(
        User,
        {},
        { select: '-password', sort: { createdAt: -1 } },
        page,
        limit
      ),
      1800 // 30 minutes for paginated results
    );
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw new Error('Failed to fetch users.');
  }
},

    getUserBalance: async (_, { userId }) => {
      try {
        const user = await User.findById(userId).select("accountBalance");
        if (!user) throw new Error("User not found");
        return user.accountBalance || 0;
      } catch (err) {
        console.error("❌ Error fetching balance:", err);
        throw new Error("Failed to fetch balance");
      }
    },

    getUserEarnings: async (_, { userId }) => {
      try {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        // Calculate pending earnings from transactions with 'pending' status
        const pendingTransactions = await Transaction.find({
          userId: userId,
          status: 'pending',
          type: 'credit'
        });

        const pendingEarnings = pendingTransactions.reduce((sum, transaction) => {
          return sum + transaction.amount;
        }, 0);

        // Calculate total earnings from all completed credit transactions
        const totalTransactions = await Transaction.find({
          userId: userId,
          status: 'completed',
          type: 'credit'
        });

        const totalEarnings = totalTransactions.reduce((sum, transaction) => {
          return sum + transaction.amount;
        }, 0);

        return {
          pendingEarnings,
          totalEarnings,
          monthlySalary: user.monthlySalary || 0
        };
      } catch (err) {
        console.error("❌ Error fetching user earnings:", err);
        throw new Error("Failed to fetch user earnings");
      }
    },
    
    user: async (_, { id }) => {
      try {
        return await User.findById(id);
      } catch (error) {
        console.error(`Error fetching user with id ${id}:`, error);
        throw new Error("Failed to fetch user.");
      }
    },
    getMyProfile: async (_, __, { user }) => {

      if (!user) {
        throw new Error("You must be logged in to view your profile");
      }

      try {
        const dbUser = await User.findOne({ uid: user.uid }).select("-password"); // exclude password
        if (!dbUser) {
          throw new Error("User not found.");
        }
        return dbUser;
      } catch (error) {
        console.error("Error in getMyProfile:", error);
        throw new Error("Failed to retrieve profile.");
      }
    },

    validateSignup: async (_, { username, email }) => {
      try {
        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return {
            success: false,
            message: "Username already exists",
            isValid: false
          };
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          return {
            success: false,
            message: "Email already exists",
            isValid: false
          };
        }

        return {
          success: true,
          message: "Validation passed",
          isValid: true
        };
      } catch (error) {
        console.error("Error in validateSignup:", error);
        return {
          success: false,
          message: "Validation failed due to server error",
          isValid: false
        };
      }
    },

    getStaffSalaryPreview: async (_, __, { user }) => {
      // Check admin permissions
      if (!user) {
        throw new Error("Forbidden: Admin access required");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
        throw new Error("Forbidden: Admin access required");
      }

      // Get all staff with salaries
      const workers = await User.find({ role: 'worker', monthlySalary: { $gt: 0 } });
      const customerCare = await User.find({ role: 'customerCare', monthlySalary: { $gt: 0 } });
      const assistantAdmins = await User.find({ role: 'assistantAdmin', monthlySalary: { $gt: 0 } });

      // Calculate totals
      const workerTotal = workers.reduce((sum, w) => sum + w.monthlySalary, 0);
      const ccTotal = customerCare.reduce((sum, c) => sum + c.monthlySalary, 0);
      const adminTotal = assistantAdmins.reduce((sum, a) => sum + a.monthlySalary, 0);
      const grandTotal = workerTotal + ccTotal + adminTotal;

      // Get current business_operation balance (for salary payments)
      const businessOperation = await SystemAccount.findOne({ type: 'business_operation' });

      return {
        staff: [...workers, ...customerCare, ...assistantAdmins],
        totals: { workerTotal, ccTotal, adminTotal, grandTotal },
        currentRevenueNet: businessOperation?.balance || 0,  // ✅ NEW: Show business operation balance
        remainingAfterPayment: (businessOperation?.balance || 0) - grandTotal  // ✅ NEW: Check business operation
      };
    },

  },
  Mutation: {
    
    activateLandlord: async (_, __, { user }) => {
      if (!user) throw new Error('Unauthorized: Please log in again');

      const landlord = await User.findOne({ uid: user.uid });
      if (!landlord) throw new Error('User not found');
      if (landlord.role !== 'landlord') throw new Error('Only landlords can activate accounts');
      if (landlord.isActivated) {
        return { success: false, message: 'Landlord account already activated', transaction: null };
      }

      const fees = getFees();
      const activationFee = fees.activationFee;

      if (landlord.accountBalance < activationFee) {
        return { success: false, message: 'Insufficient balance for activation', transaction: null };
      }

      // Deduct balance and mark as activated
      landlord.accountBalance -= activationFee;
      landlord.isActivated = true;
      await landlord.save();

      // Record transaction
      const transaction = new Transaction({
        userId: landlord._id,
        type: 'activation',
        amount: activationFee,
        balanceAfter: landlord.accountBalance,
        status: 'completed',
        paymentMethod: 'wallet',
        purpose: 'User Activation Request',
        createdAt: new Date(),
      });
      await transaction.save();

      // 🏦 Hold activation fee in accounts for later allocation
      let activationHoldingAmount = activationFee;
      let referralHoldingAmount = 0;

      // Referral portion
      if (landlord.referredBy) {
        const referrer = await User.findById(landlord.referredBy);
        if (referrer) {
          referralHoldingAmount = Math.round((activationFee * fees.referralBonus) / 100);
          activationHoldingAmount -= referralHoldingAmount;

          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_referral_holding' },
            { $inc: { balance: referralHoldingAmount } },
            { upsert: true, new: true }
          );

          await MoneyFlow.create({
            type: 'holding',
            category: 'referral',
            amount: referralHoldingAmount,
            description: `Referral portion held for ${referrer._id} referring ${landlord._id}`,
            userId: referrer._id,
          });
        }
      }

      // Activation holding (customer care + net revenue portion)
      if (activationHoldingAmount > 0) {
        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_activation_holding' },
          { $inc: { balance: activationHoldingAmount } },
          { upsert: true, new: true }
        );

        await MoneyFlow.create({
          type: 'holding',
          category: 'registration_fee',
          amount: activationHoldingAmount,
          description: `Activation fee held for landlord ${landlord._id}`,
          userId: landlord._id,
        });

        // ✅ REMOVED: Don't sync to unified revenue - money is in holding, not realized revenue yet
      }

      return { success: true, message: 'Landlord account activated successfully', transaction };
    },

    
    updateUser: validateGraphQLInput(updateUserSchema)(async (_, { id, fname, lname, username, email, phone, gender, account, county, subcounty, ward }) => {
      try {
        return await User.findByIdAndUpdate(
          id,
          { fname, lname, username, email, phone, gender, account, county, subcounty, ward },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.error(`Error updating user with id ${id}:`, error);
        throw new Error("Failed to update user.");
      }
    }),

    saveImageUrl: async (_, { path }, { user }) => {
      try {
        if (!user) {
          throw new Error("You must be logged in to update your profile image");
        }

        const dbUser = await User.findOne({ uid: user.uid });
        if (!dbUser) {
          throw new Error("User not found");
        }

        const updatedUser = await User.findByIdAndUpdate(
          dbUser._id,
          { image: path },
          { new: true, runValidators: true }
        );

        if (!updatedUser) {
          throw new Error("User not found");
        }

        // Invalidate cache for the user
        await invalidateEntityCache('user', dbUser._id);

        return {
          success: true,
          message: "Profile image updated successfully",
          imagePath: updatedUser.image
        };
      } catch (error) {
        console.error("Error saving image URL:", error);
        return {
          success: false,
          message: error.message || "Failed to save image URL",
          imagePath: null
        };
      }
    },

    loginUser: async (_, __, { user }) => {
      // Since Firebase handles auth, this mutation verifies the Firebase token
      if (!user) {
        throw new Error("Invalid Firebase token");
      }

      // Find or create user in MongoDB using Firebase UID
      let dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) {
        // Create user if not exists
        dbUser = await User.create({
          uid: user.uid,
          email: user.email,
          // Add other default fields as needed
        });
      }

      return {
        success: true,
        message: "Login successful",
        token: user.uid, // Use Firebase UID as token
        user: {
          _id: dbUser._id,
          uid: dbUser.uid,
          email: dbUser.email,
          fname: dbUser.fname,
          lname: dbUser.lname,
          username: dbUser.username,
          role: dbUser.role,
          isApproved: dbUser.isApproved,
          isActivated: dbUser.isActivated,
          accountBalance: dbUser.accountBalance,
          county: dbUser.county,
          subcounty: dbUser.subcounty,
          ward: dbUser.ward,
          phone: dbUser.phone,
          image: dbUser.image,
        }
      };
    },

    registerUser: async (_, { fname, lname, username, phone, gender, role, county, subcounty, ward, referredBy }, { user }) => {
      // Since Firebase handles signup, this mutation creates the user record in MongoDB
      if (!user) {
        throw new Error("Invalid Firebase token");
      }

      // Check if user already exists
      const existingUser = await User.findOne({ uid: user.uid });
      if (existingUser) {
        throw new Error("User already exists");
      }

      // 🔍 Convert referral code (username) to user ObjectId
      let referrerObjectId = null;
      if (referredBy && referredBy.trim()) {
        const referrer = await User.findOne({
          $or: [
            { username: referredBy.trim() },     // Try username
            { referralCode: referredBy.trim() }  // Try referralCode
          ]
        });

        if (referrer) {
          referrerObjectId = referrer._id;  // Store ObjectId for proper referencing
        } else {
          throw new Error(`Invalid referral code: ${referredBy}. Please check the referral code and try again.`);
        }
      }

      // Create user in MongoDB
      const dbUser = await User.create({
        uid: user.uid,
        fname,
        lname,
        username,
        email: user.email,
        phone,
        gender,
        role,
        county,
        subcounty,
        ward,
        referredBy: referrerObjectId,  // 👈 Store ObjectId, not string
        isApproved: false,
        isActivated: false,
        accountBalance: 0,
      });

      return {
        success: true,
        message: "Registration successful",
        token: user.uid,
        user: {
          _id: dbUser._id,
          uid: dbUser.uid,
          fname: dbUser.fname,
          lname: dbUser.lname,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
          isApproved: dbUser.isApproved,
          isActivated: dbUser.isActivated,
          accountBalance: dbUser.accountBalance,
          county: dbUser.county,
          subcounty: dbUser.subcounty,
          ward: dbUser.ward,
          phone: dbUser.phone,
          image: dbUser.image,
        }
      };
    },

    updateStaffSalary: async (_, { userId, amount }, { user }) => {
      // Check admin permissions
      if (!user) {
        throw new Error("Forbidden: Admin access required");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
        throw new Error("Forbidden: Admin access required");
      }

      // Update user's monthlySalary
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { monthlySalary: amount },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new Error("User not found");
      }

      return {
        success: true,
        message: `Staff salary updated successfully`,
        user: updatedUser
      };
    },

    payStaffSalaries: async (_, __, { user }) => {
      // Check admin permissions
      if (!user) {
        throw new Error("Forbidden: Admin access required");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
        throw new Error("Forbidden: Admin access required");
      }

      // Get all staff with monthlySalary > 0
      const staff = await User.find({
        role: { $in: ['worker', 'customerCare', 'assistantAdmin'] },
        monthlySalary: { $gt: 0 }
      });

      // Calculate total payment needed
      const totalPayment = staff.reduce((sum, s) => sum + s.monthlySalary, 0);

      // Check business_operation balance
      const businessOperation = await SystemAccount.findOne({ type: 'business_operation' });
      if (!businessOperation || businessOperation.balance < totalPayment) {
        throw new Error('Insufficient business operation balance for salary payments');
      }

      // Process payments with transaction safety
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // ✅ NEW: Debit business_operation (for salary payments)
        await SystemAccount.findOneAndUpdate(
          { type: 'business_operation' },
          { $inc: { balance: -totalPayment } },
          { session }
        );

        // Also credit expenses_staff_salaries for tracking
        await SystemAccount.findOneAndUpdate(
          { type: 'expenses_staff_salaries' },
          { $inc: { balance: totalPayment } },
          { session }
        );

        // Pay each staff member
        for (const member of staff) {
          member.accountBalance += member.monthlySalary;
          member.lastSalaryPayment = new Date();
          await member.save({ session });

          // Record transaction
          const transaction = new Transaction({
            userId: member._id,
            type: 'credit',
            amount: member.monthlySalary,
            balanceAfter: member.accountBalance,
            status: 'completed',
            paymentMethod: 'wallet',
            purpose: 'Monthly salary payment'
          });
          await transaction.save({ session });

          // Record MoneyFlow
          const moneyFlow = new MoneyFlow({
            type: 'expense',
            category: 'staff_salary',
            amount: member.monthlySalary,
            description: `Monthly salary payment to ${member.fname} ${member.lname}`,
            userId: member._id
          });
          await moneyFlow.save({ session });
        }

        await session.commitTransaction();
        return { success: true, totalPaid: totalPayment, staffCount: staff.length };

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
  }
};
