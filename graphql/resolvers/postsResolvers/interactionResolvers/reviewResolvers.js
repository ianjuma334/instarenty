import Review from '../../../../Data/ReviewDetails.js';
import Post from '../../../../Data/PostDetails.js';
import Booking from '../../../../Data/BookingDetails.js';
import { User } from '../../../../Data/UserDetails.js';
import { getSocketIo } from '../../../../services/socket.js';
import { paginateResults } from '../../../../utils/paginate.js';

const reviewResolvers = {
    Query : {
        reviews: async (_, { postId, after, limit }) => {
            try {
            console.log("Fetching reviews for postId:", postId);
            // Step 1: Paginate reviews for the given post
            const paginated = await paginateResults({
                model: Review,
                after,
                limit,
                filter: { postId },
                populate: {
                path: 'userId',
                select: 'fname lname username image',
                },
            });
            console.log("Paginated reviews:", paginated.edges.length);

            // Step 2: Format the nodes
            const formattedEdges = paginated.edges.map(({ node, cursor }) => ({
                node: {
                id: node._id.toString(),
                postId: node.postId.toString(),
                userId: node.userId._id.toString(),
                rating: node.rating,
                review: node.review,
                createdAt: node.createdAt.toISOString(),
                userFname: node.userId?.fname || '',
                userLname: node.userId?.lname || '',
                userName: node.userId?.username || '',
                userImage: node.userId?.image || '',
                },
                cursor,
            }));

            console.log("Formatted reviews:", formattedEdges.length);

            // Step 3: Return paginated format
            return {
                edges: formattedEdges,
                pageInfo: paginated.pageInfo,
            };

            } catch (error) {
            console.error("Error fetching reviews:", error);
            throw new Error("Failed to fetch reviews");
            }
        },

    },
    Mutation:{
        addReview: async (_, { postId, rating, comment }, {user, redis}) => {

            if (!user ) {
              return {
                success: false,
                message: "Not authorized to add review.",
                review: null
              };
            }

            const dbUser = await User.findOne({ uid: user.uid });
            if (!dbUser) {
              return {
                success: false,
                message: "User not found.",
                review: null
              };
            }

            let post = await Post.findById(postId);
            if (!post) {
              return {
                success: false,
                message: "Post not found.",
                review: null
              };
            }

            let postOwner = await User.findById(post.userId);

            if(postOwner._id.toString() === dbUser._id.toString()) {
              return {
                success: false,
                message: "You cannot review your own post.",
                review: null
              }
            }

            let bookedPost = await Booking.findOne({postId, userId:dbUser._id});

            if (!bookedPost) {
              return {
                success: false,
                message: "Not authorized to review this Rental. You need to have booked this Rental first.",
                review: null
              };
            }

            let existingReview = await Review.findOne({postId, userId:dbUser._id});

            if (existingReview) {
              return {
                success: false,
                message: "You have already reviewed this post. Use updateReview to edit.",
                review: null
              };
            }

            const newReview = await Review.create({ postId, userId:dbUser._id, rating, review: comment });

            // Calculate new average rating
            const allReviews = await Review.find({ postId });
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
            await Post.findByIdAndUpdate(postId, { averageRatings: averageRating });

            // 🗑️ CRITICAL FIX: Clear Redis cache for average rating update
            console.log('🗑️ Clearing Redis cache for post (add review):', postId);
            try {
                const cacheKey = `post:${postId}`;
                await redis?.del(cacheKey);
                console.log('✅ Redis cache cleared for post (add review):', postId);
            } catch (cacheError) {
                console.warn('⚠️ Redis cache clear error (add review):', cacheError.message);
            }

            const reviewData = {
              id: newReview._id,
              postId,
              userId: dbUser._id,
              rating,
              review: comment,
              createdAt: newReview.createdAt,
              userFname: dbUser.fname || '',
              userLname: dbUser.lname || '',
              userName: dbUser.username || '',
              userImage: dbUser.image || ''
            };

            try {
              const io = getSocketIo();
              io.emit('reviewAdded', reviewData);
            } catch (err) {
              console.warn('Socket.IO not initialized:', err.message);
            }

            return{
              success: true,
              message: "Review added successfully.",
              review: reviewData,
            }

          },
        updateReview: async (_, { postId, rating, review }, {user, redis}) => {
            console.log("Updating review for postId:", postId, "user:", user.uid, "rating:", rating, "review:", review);

            if (!user ) {
              return {
                success: false,
                message: "Not authorized to update review.",
                report: null
              };
            }

            const dbUser = await User.findOne({ uid: user.uid });
            if (!dbUser) {
              return {
                success: false,
                message: "User not found.",
                report: null
              };
            }

            let post = await Post.findById(postId);
            let postOwner = await User.findById(post.userId);

            if(postOwner._id.toString() === dbUser._id.toString()) {
              return {
                success: false,
                message: "You cannot review your own post.",
                report: null
              }
            }

            let bookedPost = await Booking.findOne({postId, userId:dbUser._id});

            if (!bookedPost) {
              return {
                success: false,
                message: "Not authorized to review this Rental you need to have booked this Rental first.",
                report: null
              };
            }

            let updatedReview = await Review.findOne({postId, userId:dbUser._id});
            console.log("Found existing review:", !!updatedReview);

            if (updatedReview) {
              updatedReview.rating = rating;
              updatedReview.review = review;
              await updatedReview.save();
              console.log("Updated review");
            } else {
              updatedReview = await Review.create({ postId, userId:dbUser._id, rating, review });
              console.log("Created new review");
            }

            // Calculate new average rating
            const allReviews = await Review.find({ postId });
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
            await Post.findByIdAndUpdate(postId, { averageRatings: averageRating });
            
            // 🗑️ CRITICAL FIX: Clear Redis cache for average rating update
            console.log('🗑️ Clearing Redis cache for post (update review):', postId);
            try {
                const cacheKey = `post:${postId}`;
                await redis?.del(cacheKey);
                console.log('✅ Redis cache cleared for post (update review):', postId);
            } catch (cacheError) {
                console.warn('⚠️ Redis cache clear error (update review):', cacheError.message);
            }
            
            console.log("New average rating:", averageRating);

            const reviewUpdated = {
              id: updatedReview._id.toString(),
              postId,
              userId:dbUser._id,
              rating,
              review,
              userFname: dbUser.fname || '',
              userLname: dbUser.lname || '',
              userName: dbUser.username || '',
              userImage: dbUser.image || '',
              createdAt: updatedReview.createdAt.toISOString(),
            };

            try {
              const io = getSocketIo();
              io.emit('reviewUpdated', reviewUpdated);
            } catch (err) {
              console.warn('Socket.IO not initialized:', err.message);
            }

            // Return the updated counts

            return{
              success: true,
              message: "Review updated successfully.",
              review: reviewUpdated,
            }

          },
    }
}
export default reviewResolvers;