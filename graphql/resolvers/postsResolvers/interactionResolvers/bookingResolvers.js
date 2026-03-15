import Post from '../../../../Data/PostDetails.js';
import Booking from '../../../../Data/BookingDetails.js';
import Transaction from '../../../../Data/TransactionDetails.js';
import { User } from '../../../../Data/UserDetails.js';
import SystemAccount from '../../../../Data/SystemAccountDetails.js';
import MoneyFlow from '../../../../Data/MoneyFlowDetails.js';
import { getSocketIo } from '../../../../services/socket.js';
import { paginateResults } from '../../../../utils/paginate.js';
import Notification from '../../../../Data/NotificationDetails.js';
import { getFees } from '../../../../services/feesService.js';
import { formatPaginatedPosts, formatPost } from '../../../../utils/formatPost.js';
import { notifyBalanceUpdate } from '../../../../mpesa/mpesaResolver.js';
import bookingNotificationService from '../../../../services/bookingNotificationService.js';

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

const bookingResolvers = {
    Query : {
        myBookings: async (_, { after, limit }, { user }) => {
if (!user) {
    return {
      success: false,
      message: "Not authorized to view bookings",
    };
  }

  try {
    // Step 1: Fetch booking post IDs for the user
    const dbUser = await User.findOne({ uid: user.uid });
    if (!dbUser) {
      return {
        success: false,
        message: "User not found",
      };
    }
    const bookings = await Booking.find({ userId: dbUser._id }).select("postId");
    const postIds = bookings.map(booking => booking.postId);

    // Step 2: Paginate the related posts
    const paginated = await paginateResults({
      model: Post,
      after,
      limit,
      filter: { _id: { $in: postIds } },
      populate: [
        { path: "userId", select: "fname lname phone" },
        { path: "amenities.amenity" },
      ],
    });

        return formatPaginatedPosts(paginated);
      } catch (error) {
        console.error("Error fetching favorite posts:", error);
        return {
          success: false,
          message: "Failed to retrieve favorite posts",
          error,
        };
      }
},
        bookingsByPost: async (_, { postId, after, limit }, { user }) => {
            if (!user) {
            return {
                success: false,
                message: "Not authorized to view bookings",
            };
            }
        
            try {
            const paginated = await paginateResults({
                model: Booking,
                after,
                limit,
                filter: { postId },
            });
        
            const bookings = paginated.edges.map(edge => edge.node);
            const userIds = bookings.map(b => b.userId);
        
            const users = await User.find({ _id: { $in: userIds } });
            const userMap = {};
            users.forEach(u => {
                userMap[u._id.toString()] = u;
            });
        
            const formattedEdges = paginated.edges.map(({ node, cursor }) => {
                const userInfo = userMap[node.userId.toString()] || {};
        
                return {
                node: {
                    fname: userInfo.fname || '',
                    lname: userInfo.lname || '',
                    username: userInfo.username || '',
                    phone: userInfo.phone || '',
                    numberBooked: node.numberBooked || 0,
                    date: node.createdAt,
                },
                cursor,
                };
            });
        
            return {
                edges: formattedEdges,
                pageInfo: paginated.pageInfo,
            };
        
            } catch (error) {
            console.error("Error fetching bookings for post:", error);
            throw new Error("Failed to fetch bookings");
            }
        },
        getNotifications: async (_, __, { user }) => {
            if (!user) throw new Error("Unauthenticated");
            return await Notification.find({ userId: user._id }).sort({ createdAt: -1 });
        }

    },
    Mutation:{
        booking: async (_, { postId, numberBooked }, { user, redis }) => {
            if (!user) {
              return {
                success: false,
                message: "Not authorized to book.",
                booking: null,
              };
            }
          
            const dbUser = await User.findOne({ uid: user.uid });
            if (!dbUser) {
              return {
                success: false,
                message: "User not found.",
                booking: null,
              };
            }

            const post = await Post.findById(postId);
            const userAccount = await User.findById(dbUser._id);
          
            if (!post) {
              return {
                success: false,
                message: "Post not found.",
                booking: null,
              };
            }
            const fees = getFees();
            const BOOKING_FEE = fees.bookingFee;
            const accountBal = userAccount.accountBalance;
          
            let existingBooking = await Booking.findOne({ postId, userId: dbUser._id });
          
            // if (existingBooking) {
            //   return {
            //     success: false,
            //     message: "You have already booked this post.",
            //     booking: null,
            //   };
            // }
          
            // Check if user has sufficient balance for booking
            if (accountBal < BOOKING_FEE) {
              return {
                success: false,
                message: "Insufficient balance for booking.",
                booking: null,
              };
            }

            // Create booking transaction
            await Transaction.create({
              userId: dbUser._id,
              postId,
              status: "completed",
              type: "booking",
              amount: BOOKING_FEE,
              balanceAfter: accountBal - BOOKING_FEE,
              purpose: "Booking",
              approvedBy: "67f906bac8b6d35ab1009450", // Consider fetching admin ID dynamically
            });

            // Deduct from user balance
            userAccount.accountBalance -= BOOKING_FEE;
            await User.updateOne({ _id: dbUser._id }, { accountBalance: userAccount.accountBalance });

            // Deposit fee to revenue_booking account
            await SystemAccount.findOneAndUpdate(
              { type: 'revenue_booking' },
              { $inc: { balance: BOOKING_FEE } },
              { new: true, upsert: true }
            );

            // Record MoneyFlow for booking fee
            const moneyFlow = new MoneyFlow({
              type: 'income',
              category: 'booking_fee',
              amount: BOOKING_FEE,
              description: `Booking fee for post ${postId}`,
              userId: dbUser._id,
              postId: postId,
            });
            await moneyFlow.save();

            // ✅ NEW: Sync to unified revenue account
            await syncToUnifiedRevenue('booking_fee', BOOKING_FEE);

            notifyBalanceUpdate(userAccount._id.toString(), userAccount.accountBalance);
          
            if (post.numberOfVacancies < numberBooked) {
              return {
                success: false,
                message: "Not enough vacancies available.",
                booking: null,
              };
            }
          
            const newBooking = await Booking.create({
              postId,
              userId: dbUser._id,
              numberBooked,
            });

            const landlordId = post.userId;
            const tenantId = dbUser._id;
            const tenantUsername = dbUser.username;
      
            // ✅ NEW: Use BookingNotificationService for proper FCM notifications
            try {
              const notificationResult = await bookingNotificationService.sendBookingNotificationToLandlord({
                postId,
                tenantId,
                numberBooked,
                bookingId: newBooking._id.toString()
              });

              console.log('Booking notification result:', notificationResult);
              
              // Also send confirmation to tenant
              await bookingNotificationService.sendBookingConfirmationToTenant({
                postId,
                tenantId,
                numberBooked,
                bookingId: newBooking._id.toString()
              });

            } catch (notificationError) {
              console.error('Error sending booking notifications:', notificationError);
              // Don't fail the booking if notifications fail
            }
      
            const remainingVacancies = post.numberOfVacancies - numberBooked;
            
            console.log("Remaining vacancies:", remainingVacancies);
          
            //const remainingVacancies = Number(post.numberOfVacancies) - numberBooked;
            post.numberOfVacancies = remainingVacancies;
            await Post.findByIdAndUpdate(postId, {
              numberOfVacancies: remainingVacancies,
            });

            // 🗑️ CRITICAL FIX: Clear Redis cache for vacancy update
            console.log('🗑️ Clearing Redis cache for post (booking):', postId);
            try {
                const cacheKey = `post:${postId}`;
                await redis?.del(cacheKey);
                console.log('✅ Redis cache cleared for post (booking):', postId);
            } catch (cacheError) {
                console.warn('⚠️ Redis cache clear error (booking):', cacheError.message);
            }
            
      
          
            // Emit socket update
            try {
              const io = getSocketIo();
              io.emit("updateBooking", newBooking);
              io /**  .to(landlordId.toString()) */.emit("newNotification", {
                message: `${tenantUsername} has booked your room.`,
                type: "BOOKING"
              });
              
            } catch (err) {
              console.warn("Socket.IO not initialized:", err.message);
            }
          
            return {
              success: true,
              message: "Booking completed successfully.",
              booking: newBooking,
            };
          },

    }
}
export default bookingResolvers;