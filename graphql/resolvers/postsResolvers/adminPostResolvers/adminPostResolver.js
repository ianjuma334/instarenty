import {User, roles} from '../../../../Data/UserDetails.js'; // Import the User model androles from the User model//  roles}
import Post from '../../../../Data/PostDetails.js';
import { paginateResults } from '../../../../utils/paginate.js';
import Grab from '../../../../Data/GrabDetails.js';
import { expireGrabIfNeeded } from '../../../../utils/expireGrab.js';
import SystemAccount from '../../../../Data/SystemAccountDetails.js';
import MoneyFlow from '../../../../Data/MoneyFlowDetails.js';

// ✅ NEW: Helper function to sync revenue to unified account
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

const ADMIN_ROLES = ['ADMIN', 'admin', 'ASSISTANT_ADMIN','assistantAdmin', 'CUSTOMER_CARE', 'customerCare', 'WORKER', 'worker'];


const adminPostResolvers = {
  Query: {
    pendingApprovalPosts: async (_, { after, limit }, { user }) => {
      if (!user) throw new Error('Unauthorized');
    
      const filter = { isApproved: false, isConfirmed: true };
    
      return await paginateResults({
        model: Post,
        after,
        limit,
        filter,
        populate: {
          path: 'userId',
          select: 'fname lname phone username',
        },
        select: 'county subCounty ward isApproved type',
      });
    },
    pendingConfirmationPosts: async (_, { after, limit }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      // Step 1: Get all posts that are not confirmed (ignore activeWorkerGrab for now)
      const allPosts = await paginateResults({
        model: Post,
        after,
        limit,
        filter: { isConfirmed: false },
        populate: [
          { path: 'userId', select: 'fname lname phone username' },
          { path: 'activeWorkerGrab' },
          { path: 'activeCustomerGrab' },
        ],
        select: 'county subCounty ward isApproved type activeWorkerGrab activeCustomerGrab',
      });

      // Step 2: Expire grabs for all posts
      if (allPosts && Array.isArray(allPosts.edges)) {
        const edgesWithExpiration = await Promise.all(
          allPosts.edges.map(async (edge) => {
            const updatedNode = await expireGrabIfNeeded(edge.node);
            return { ...edge, node: updatedNode };
          })
        );

        // Step 3: Filter out posts that are currently grabbed (active grabs)
        const filteredEdges = edgesWithExpiration.filter(
          edge => !edge.node.activeWorkerGrab
        );

        return { ...allPosts, edges: filteredEdges };
      }

      // Fallback: simple array pagination
      if (Array.isArray(allPosts)) {
        const postsWithExpiration = await Promise.all(
          allPosts.map(async (post) => await expireGrabIfNeeded(post))
        );

        // Filter out active grabs
        return postsWithExpiration.filter(p => !p.activeWorkerGrab);
      }

      return [];
    },
    grabbedPendingConfirmationPosts: async (_, { after, limit }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      // Step 1: Get all posts that are not confirmed
      const allPosts = await paginateResults({
        model: Post,
        after,
        limit,
        filter: { isConfirmed: false },
        populate: [
          { path: 'userId', select: 'fname lname phone username' },
          { path: 'activeWorkerGrab' },
          { path: 'activeCustomerGrab' },
        ],
        select: 'county subCounty ward isApproved type activeWorkerGrab activeCustomerGrab',
      });

      // Step 2: Expire grabs for all posts
      if (allPosts && Array.isArray(allPosts.edges)) {
        const edgesWithExpiration = await Promise.all(
          allPosts.edges.map(async (edge) => {
            const updatedNode = await expireGrabIfNeeded(edge.node);
            return { ...edge, node: updatedNode };
          })
        );

        // Step 3: Filter posts grabbed specifically by this user
        const dbUser = await User.findOne({ uid: user.uid });
        if (!dbUser) throw new Error('User not found');

        const filteredEdges = edgesWithExpiration.filter(edge => {
          const grab = edge.node.activeWorkerGrab;
          return grab && grab.grabbedBy.toString() === dbUser._id.toString();
        });

        return { ...allPosts, edges: filteredEdges };
      }

      // Fallback: simple array pagination
      if (Array.isArray(allPosts)) {
        const postsWithExpiration = await Promise.all(
          allPosts.map(async (post) => await expireGrabIfNeeded(post))
        );

        return postsWithExpiration.filter(post => {
          const grab = post.activeWorkerGrab;
          return grab && grab.grabbedBy.toString() === dbUser._id.toString();
        });
      }

      return [];
    },


    noPhotosPosts: async (_, { after, limit }, { user }) => {
      if (!user) throw new Error('Unauthorized'); 
    
      const filter = { photosAvailable: false };
    
      return await paginateResults({
        model: Post,
        after,
        limit,
        filter,
        populate: {
          path: 'userId',
          select: 'fname lname phone username',
        },
        select: 'county subCounty ward isApproved type',
      });
    }
    
    
  },
  Mutation: {

    approvePost: async (_, { postId }, {user}) => {
      if (!user) {
        throw new Error('Unauthorized');
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
        throw new Error('Unauthorized');
      }

      try {
        const post = await Post.findById(postId);

        if (!post) {
          return{
            success: false,
            message: 'Post not found'
          };
        }

        // 🔒 IDEMPOTENCY GUARD: Check at the very beginning, before any money logic
        if(post.isApproved){
          return{
              success: false,
              message: 'Post already approved'
            };
        }

        if(post.isFlagged){
            return{
                success: false,
                message: 'Post owner is flagged cannot approve cannot approve this post'
              };
        }

        // Get fees
        const { getFees } = await import('../../../../services/feesService.js');
        const fees = getFees();
        const workerPercentage = fees.workerPercentage;
        const customerCarePercentage = fees.customerCarePercentage;

        // 🎯 INDIVIDUAL POST REVENUE ALLOCATION
        // Calculate this specific post's contribution amounts (not shared pool)

        const postUploadFee = fees.postUploadFee; // Each post costs exactly this amount

        // Calculate payments for THIS specific post
        const workerPayment = Math.round((postUploadFee * workerPercentage) / 100);
        const customerCarePayment = Math.round((postUploadFee * customerCarePercentage) / 100);
        const netRevenue = postUploadFee - workerPayment - customerCarePayment;

        console.log('Individual post allocations:', { postUploadFee, workerPayment, customerCarePayment, netRevenue });

        // 🔍 UPFRONT TOTAL BALANCE CHECK to prevent negative balances
        const holdingAccount = await SystemAccount.findOne({ type: 'revenue_post_holding' });
        if (!holdingAccount || holdingAccount.balance < postUploadFee) {
          throw new Error(`Insufficient post holding balance for approval. Required: ${postUploadFee}, Available: ${holdingAccount?.balance || 0}`);
        }

        // Finalize allocations from holding account
        if (workerPayment > 0) {
          // 🔍 BALANCE VALIDATION: Ensure sufficient holding balance
          const holdingAccount = await SystemAccount.findOne({ type: 'revenue_post_holding' });
          if (!holdingAccount || holdingAccount.balance < workerPayment) {
            throw new Error(`Insufficient post holding balance for worker payment. Required: ${workerPayment}, Available: ${holdingAccount?.balance || 0}`);
          }

          // Move worker payment directly from holding to allocated
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_post_holding' },
            {
              $inc: { balance: -workerPayment },
              lastUpdated: new Date(),
              updatedBy: dbUser._id,
              description: `Worker payment allocation for post ${postId}`
            },
            { upsert: true }
          );

          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_worker_allocated' },
            {
              $inc: { balance: workerPayment },
              lastUpdated: new Date(),
              updatedBy: dbUser._id,
              description: `Worker allocation for post ${postId}`
            },
            { upsert: true }
          );

          // Find and pay the worker who confirmed this post
          const worker = await User.findById(post.isConfirmedBy);

          if (worker) {
            worker.accountBalance += workerPayment;
            worker.pendingEarnings -= workerPayment;
            worker.totalEarnings += workerPayment;

            await worker.save();

            // Create transaction record
            const { default: Transaction } = await import('../../../../Data/TransactionDetails.js');
            const transaction = new Transaction({
              userId: worker._id,
              type: 'credit',
              amount: workerPayment,
              balanceAfter: worker.accountBalance,
              status: 'completed',
              paymentMethod: 'wallet',
              purpose: `Worker payment for approved post ${postId}`,
              approvedBy: dbUser._id
            });
            await transaction.save();

            // Record MoneyFlow for worker payment
            const moneyFlowWorker = new MoneyFlow({
              type: 'expense',
              category: 'worker_payment',
              amount: workerPayment,
              description: `Worker payment for approved post ${postId}`,
              postId: post._id,
              userId: worker._id,
            });
            await moneyFlowWorker.save();

          } else {
            throw new Error('Worker not found for payment');
          }
        }

        if (customerCarePayment > 0) {
          // 🔍 BALANCE VALIDATION for customer care
          const holdingBeforeCC = await SystemAccount.findOne({ type: 'revenue_post_holding' });
          if (!holdingBeforeCC || holdingBeforeCC.balance < customerCarePayment) {
            throw new Error(`Insufficient post holding balance for customer care payment. Required: ${customerCarePayment}, Available: ${holdingBeforeCC?.balance || 0}`);
          }

          // Allocate customer care payment from holding
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_post_holding' },
            {
              $inc: { balance: -customerCarePayment },
              lastUpdated: new Date(),
              updatedBy: dbUser._id,
              description: `Customer care payment allocation for post ${postId}`
            },
            { upsert: true }
          );

          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_customercare_allocated' },
            {
              $inc: { balance: customerCarePayment },
              lastUpdated: new Date(),
              updatedBy: dbUser._id,
              description: `Customer care allocation for post ${postId}`
            },
            { upsert: true }
          );

          // Pay customer care (already validated dbUser exists)
          dbUser.accountBalance += customerCarePayment;
          dbUser.totalEarnings += customerCarePayment;

          await dbUser.save();

          // Create transaction record
          const { default: Transaction } = await import('../../../../Data/TransactionDetails.js');
          const transaction = new Transaction({
            userId: dbUser._id,
            type: 'credit',
            amount: customerCarePayment,
            balanceAfter: dbUser.accountBalance,
            status: 'completed',
            paymentMethod: 'wallet',
            purpose: `Customer care payment for approving post ${postId}`,
            approvedBy: dbUser._id
          });
          await transaction.save();

          // ✅ FIXED: Record MoneyFlow for customer care payment as expense
          const moneyFlowCustomerCare = new MoneyFlow({
            type: 'expense',
            category: 'customer_care_payment',
            amount: customerCarePayment,
            description: `Customer care payment for approving post ${postId}`,
            postId: post._id,
            userId: dbUser._id,
          });
          await moneyFlowCustomerCare.save();
        }

        if (netRevenue > 0) {
          // 🔍 BALANCE VALIDATION for net revenue
          const holdingBeforeNet = await SystemAccount.findOne({ type: 'revenue_post_holding' });
          if (!holdingBeforeNet || holdingBeforeNet.balance < netRevenue) {
            throw new Error(`Insufficient post holding balance for net revenue. Required: ${netRevenue}, Available: ${holdingBeforeNet?.balance || 0}`);
          }

          // Allocate remaining to net revenue
          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_post_holding' },
            {
              $inc: { balance: -netRevenue },
              lastUpdated: new Date(),
              updatedBy: dbUser._id,
              description: `Net revenue allocation for post ${postId}`
            },
            { upsert: true }
          );

          await SystemAccount.findOneAndUpdate(
            { type: 'revenue_net' },
            {
              $inc: { balance: netRevenue },
              lastUpdated: new Date(),
              updatedBy: dbUser._id,
              description: `Net revenue for post ${postId}`
            },
            { upsert: true }
          );

          // ✅ FIXED: Follow landlord activation pattern - record NET revenue as income
          // Worker and customer care payments are expenses but don't sync to unified revenue
          const moneyFlowIncome = new MoneyFlow({
            type: 'income',
            category: 'post_net_revenue', // ✅ FOLLOW LANDLORD PATTERN: Net revenue category
            amount: postUploadFee, // gross: 200
            description: `Net revenue from approved post ${postId}`,
            postId: post._id,
            userId: post.userId,
          });
          await moneyFlowIncome.save();

          // ✅ NEW: Sync net revenue to unified account (follow landlord pattern)
          await syncToUnifiedRevenue('post_net_revenue', netRevenue);
        }

        post.isApproved = true;
        post.isApprovedBy = dbUser._id;
        await post.save();
        return {
            success: true,
            message: 'Post approved successfully' ,
            post:post};
      } catch (error) {
        console.error('Error in approvePost:', error);
        throw new Error(error.message);
      }
    },
    workerGrabPost: async (_, { postId }, { user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
        throw new Error("Unauthorized");
      }

      if (!postId) {
        throw new Error("postId is required");
      }

      try {
        // Populate activeWorkerGrab to check expiration
        const post = await Post.findById(postId).populate("activeWorkerGrab");

        if (!post) {
          return { success: false, message: "Post not found" };
        }

        // Check if current grab exists and is still valid
        if (post.activeWorkerGrab && !post.activeWorkerGrab.isExpired) {
          return { success: false, message: "Post already grabbed by another worker" };
        }

        // If previous grab exists but expired, mark it as expired (lazy expiration)
        if (post.activeWorkerGrab && post.activeWorkerGrab.isExpired) {
          post.activeWorkerGrab = null;
          await post.save();
        }

        // Set 24-hour expiration
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 2);

        // Create new Grab
        const grab = new Grab({
          postId: post._id,
          grabbedBy: dbUser._id,
          role: "worker",
          grabbedAt: new Date(),
          expiresAt,
          isExpired: false,
          penaltyPaid: false,
        });
        await grab.save();

        // Link the grab to the post
        post.activeWorkerGrab = grab._id;
        await post.save();

        return {
          success: true,
          message: "Post grabbed successfully",
          grab,
          post,
        };
      } catch (error) {
        throw new Error(error.message);
      }
    },

    customerGrabPost: async (_, { postId }, {user}) => {
      if (!user) {
        throw new Error('Unauthorized');
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
        throw new Error('Unauthorized');
      }

      try {
        const post = await Post.findById(postId);

        if (!post) {
          return{
            success: false,
            message: 'Post not found'
          };
        }

        
        if(post.isCustomerGrab){
          return{
              success: false,
              message: 'Post already grabbed'
            };
        }    
        post.isCustomerGrab = true;
        post.isCustomerGrabBy = dbUser._id;
        await post.save();
        return { 
            success: true,
            message: 'Post grabbed successfully' ,
            post:post};
      } catch (error) {
        throw new Error(error.message);
      }
    },
confirmAmenities: async (_, { postId, confirmations }, { user }) => {
  if (!user) {
    throw new Error("Unauthorized. Only workers can confirm amenities.");
  }

  const dbUser = await User.findOne({ uid: user.uid });
  if (!dbUser || dbUser.role !== "worker") {
    throw new Error("Unauthorized. Only workers can confirm amenities.");
  }

  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  // Loop over the incoming confirmation list
  confirmations.forEach(({ amenityId, confirmed }) => {
    const target = post.amenities.find(
      a => a.amenity.toString() === amenityId
    );
    if (target) {
      target.confirmed = confirmed;
    }
  });

  await post.save();
  return post;
}

}
};

export default adminPostResolvers;
