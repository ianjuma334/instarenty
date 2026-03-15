import { Query } from 'mongoose';
import Post from '../../../Data/PostDetails.js';
import Transaction from '../../../Data/TransactionDetails.js';
import User from '../../../Data/UserDetails.js';
import SystemAccount from '../../../Data/SystemAccountDetails.js';
import MoneyFlow from '../../../Data/MoneyFlowDetails.js';
import { getSocketIo } from '../../../services/socket.js'; //
import {paginateResults} from '../../../utils/paginate.js';

let io; // Ensure this is set from your socket setup

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

const featuredResolvers = {
  Query: {
    featuredPosts: async (_, { first = 10, after }, { user }) => {
      if (!user) throw new Error('Unauthorized');
    
      const filter = { isFeatured: true };
    
      return await paginateResults({
        model: Post,
        after,
        limit: first,
        filter,
        populate: {
          path: 'userId',
          select: 'fname lname phone username',
        },
        select: 'county subCounty ward isFeatured',
      });
    }
  },
  Mutation: {
    repostPost: async (_, { postId, vacancies }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) throw new Error('User not found');

      const post = await Post.findById(postId);
      if (!post) throw new Error('Post not found');

      if (post.numberOfVacancies > 0) {
        throw new Error('You can only repost when vacancies are zero.');
      }

      if (vacancies <= 0) {
        throw new Error('Vacancies must be greater than zero.');
      }

      // Get fees
      const { getFees } = await import('../../../services/feesService.js');
      const fees = getFees();
      const postRenewalFee = fees.postRenewalFee;

      // Check if landlord has sufficient balance
      const landlord = await User.findById(post.userId);
      if (landlord.accountBalance < postRenewalFee) {
        throw new Error(`Insufficient balance for post renewal. Required: KES ${postRenewalFee}, Available: KES ${landlord.accountBalance}`);
      }

      // Deduct renewal fee from landlord
      landlord.accountBalance -= postRenewalFee;
      await landlord.save();

      // Create transaction record
      const transaction = new Transaction({
        userId: post.userId,
        type: 'debit',
        amount: postRenewalFee,
        balanceAfter: landlord.accountBalance,
        status: 'completed',
        paymentMethod: 'wallet',
        purpose: 'Post renewal fee',
      });
      await transaction.save();

      // Deposit fee to revenue_renewal_holding
      await SystemAccount.findOneAndUpdate(
        { type: 'revenue_renewal_holding' },
        { $inc: { balance: postRenewalFee } },
        { new: true, upsert: true }
      );

      // Record MoneyFlow for renewal fee
      const renewalMoneyFlow = new MoneyFlow({
        type: 'income',
        category: 'other',
        amount: postRenewalFee,
        description: `Post renewal fee for post ${postId}`,
        userId: landlord._id,
        postId: postId,
      });
      await renewalMoneyFlow.save();

      // Automatic allocation to original service providers
      const workerPercentage = fees.workerPercentage;
      const customerCarePercentage = fees.customerCarePercentage;
      const workerPayment = Math.round((postRenewalFee * workerPercentage) / 100);
      const customerCarePayment = Math.round((postRenewalFee * customerCarePercentage) / 100);
      const netRevenue = postRenewalFee - workerPayment - customerCarePayment;

      // Pay original worker
      if (workerPayment > 0 && post.isConfirmedBy) {
        const worker = await User.findById(post.isConfirmedBy);
        if (worker) {
          worker.accountBalance += workerPayment;
          worker.pendingEarnings += workerPayment;
          await worker.save();

          // Allocate to worker
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_worker_allocated' },
            { $inc: { balance: workerPayment } },
            { new: true, upsert: true }
          );

          // Deduct from renewal holding
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_renewal_holding' },
            { $inc: { balance: -workerPayment } }
          );

          // Transaction for worker
          const workerTransaction = new Transaction({
            userId: worker._id,
            type: 'credit',
            amount: workerPayment,
            balanceAfter: worker.accountBalance,
            status: 'completed',
            paymentMethod: 'wallet',
            purpose: `Worker payment for post renewal ${postId}`,
          });
          await workerTransaction.save();

          // MoneyFlow
          const workerMoneyFlow = new MoneyFlow({
            type: 'expense',
            category: 'worker_payment',
            amount: workerPayment,
            description: `Worker payment for renewed post ${postId}`,
            userId: worker._id,
            postId: postId,
          });
          await workerMoneyFlow.save();
        }
      }

      // Pay original customer care
      if (customerCarePayment > 0 && post.isApprovedBy) {
        const cc = await User.findById(post.isApprovedBy);
        if (cc) {
          cc.accountBalance += customerCarePayment;
          cc.totalEarnings += customerCarePayment;
          await cc.save();

          // Allocate to customer care
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_customercare_allocated' },
            { $inc: { balance: customerCarePayment } },
            { new: true, upsert: true }
          );

          // Deduct from renewal holding
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_renewal_holding' },
            { $inc: { balance: -customerCarePayment } }
          );

          // Transaction for cc
          const ccTransaction = new Transaction({
            userId: cc._id,
            type: 'credit',
            amount: customerCarePayment,
            balanceAfter: cc.accountBalance,
            status: 'completed',
            paymentMethod: 'wallet',
            purpose: `Customer care payment for post renewal ${postId}`,
          });
          await ccTransaction.save();

          // MoneyFlow
          const ccMoneyFlow = new MoneyFlow({
            type: 'expense',
            category: 'other',
            amount: customerCarePayment,
            description: `Customer care payment for renewed post ${postId}`,
            userId: cc._id,
            postId: postId,
          });
          await ccMoneyFlow.save();
        }
      }

      // Allocate net revenue
      if (netRevenue > 0) {
        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_net' },
          { $inc: { balance: netRevenue } },
          { new: true, upsert: true }
        );

        // Deduct from renewal holding
        await SystemAccount.findOneAndUpdate(
          { type: 'revenue_renewal_holding' },
          { $inc: { balance: -netRevenue } }
        );

        // MoneyFlow
        const netMoneyFlow = new MoneyFlow({
          type: 'income',
          category: 'other',
          amount: netRevenue,
          description: `Net revenue from post renewal ${postId}`,
          userId: landlord._id,
          postId: postId,
        });
        await netMoneyFlow.save();

        // ✅ NEW: Sync realized revenue to unified account
        await syncToUnifiedRevenue('other', netRevenue);
      }

      // Update post
      post.numberOfVacancies = vacancies;
      post.repostedAt = new Date();

      const updatedPost = await post.save();

      try {
        const io = getSocketIo();
        io.emit('postReposted', updatedPost);
      } catch (err) {
        console.warn('Socket.IO not initialized:', err.message);
      }

      return updatedPost;
    },
    featurePost: async (_, { postId },{user}) => {
      // Get fees from service
      const { getFees } = await import('../../../services/feesService.js');
      const fees = getFees();
      const FEATURE_FEE = fees.featurePostFee;

      if (!user) {
        return {
          success: false,
          message: "Not authorized to feature.",
        };
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser) {
        return {
          success: false,
          message: "User not found.",
        };
      }

      const post = await Post.findById(postId);
      if (dbUser._id.toString() !== post.userId.toString()) {
        return {
          success: false,
          message: "Not authorized to feature this specific post you are not the owner.",
        };
      }

      const featuredPost = post.isFeatured;

      if (featuredPost) {
        return {
          success: false,
          message: "Post already featured.",
        };
      }
      const userAccount = await User.findById(dbUser._id);
      const accountBal = userAccount.accountBalance

      if (accountBal < FEATURE_FEE) {
        return {
          success: false,
          message: "Insufficient funds to feature post.",
        };
      }

      // Process payment
      await Transaction.create({
        userId: dbUser._id,
        postId: postId,
        status: "completed",
        type: "feature",
        amount: FEATURE_FEE,
        balanceAfter: accountBal - FEATURE_FEE,
        purpose: "Feature post",
        approvedBy: "67f906bac8b6d35ab1009450",
      });

      userAccount.accountBalance -= FEATURE_FEE;
      post.isFeatured = true;

      // Deposit fee to revenue_feature account
      await SystemAccount.findOneAndUpdate(
        { type: 'revenue_feature' },
        { $inc: { balance: FEATURE_FEE } },
        { new: true, upsert: true }
      );

      // Record MoneyFlow for feature fee
      const moneyFlow = new MoneyFlow({
        type: 'income',
        category: 'featured_fee',
        amount: FEATURE_FEE,
        description: `Feature fee for post ${postId}`,
        userId: dbUser._id,
        postId: postId,
      });
      await moneyFlow.save();

      // ✅ NEW: Sync to unified revenue account
      await syncToUnifiedRevenue('featured_fee', FEATURE_FEE);

      await userAccount.save({ validateBeforeSave: false });
      await post.save();

      return {
        success: true,
        message: "Success your account is now featured",
      }
  },
  
},
};

export default featuredResolvers;
