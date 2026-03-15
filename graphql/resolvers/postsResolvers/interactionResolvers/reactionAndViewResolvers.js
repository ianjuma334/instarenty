import Reaction from '../../../../Data/ReactionDetails.js';
import View from '../../../../Data/ViewDetails.js';
import Post from '../../../../Data/PostDetails.js';
import { getSocketIo } from '../../../../services/socket.js';
import mongoose from 'mongoose';

const reactionAndViewResolvers = {
    Query : {
        // Get user's current reaction for a specific post
        myReaction: async (_, { postId }, { user }) => {
            if (!user) {
                return null;
            }

            // Import User model to get MongoDB ObjectId
            const User = (await import('../../../../Data/UserDetails.js')).default;
            
            try {
                // Get the MongoDB user using Firebase UID
                const dbUser = await User.findOne({ uid: user.uid });
                if (!dbUser) {
                    return null;
                }

                // Find user's reaction for this post
                const userReaction = await Reaction.findOne({
                    postId,
                    userId: dbUser._id
                });

                return userReaction ? {
                    type: userReaction.type,
                    postId: userReaction.postId,
                    userId: userReaction.userId
                } : null;
                
            } catch (error) {
                console.error('Error fetching user reaction:', error);
                return null;
            }
        },
    },
    Mutation:{

updateReactions: async (_, { postId, reaction, userId }, { user, redis }) => {
  // 🚨 SERVER DEBUG: Log what we're receiving
  console.log('🚨 SERVER RECEIVED UPDATE REACTIONS 🚨');
  console.log('📥 Args received:', { postId, reaction, userId });
  console.log('📥 User context:', user);
  console.log('📥 User ID param:', userId);
  console.log('📥 User ID type:', typeof userId);

  if (!user) {
    console.log('❌ No user in context');
    return {
      success: false,
      message: "Not authorized to update reaction.",
      reaction: null,
    };
  }

  // Ensure you are using the correct models
  const PostModel = Post;       // your Post model
  const ReactionModel = Reaction; // your Reaction model

  // 🚨 Check if userId is undefined/null
  if (!userId) {
    console.log('❌ userId is missing or undefined');
    console.log('❌ userId type:', typeof userId);
    console.log('❌ userId value:', userId);
    return {
      success: false,
      message: "userId parameter is required.",
      reaction: null,
    };
  }

  // Validate that the provided userId matches the authenticated user
  // For Firebase auth, user.uid is the Firebase UID, but we need MongoDB ObjectId
  // Check if userId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log('❌ Invalid userId format:', userId);
    return {
      success: false,
      message: "Invalid user ID format.",
      reaction: null,
    };
  }

  console.log('✅ All validations passed, proceeding with reaction update...');

  // Find existing reaction by this user for this post
  console.log('🔍 Finding existing reaction...');
  let userReaction = await ReactionModel.findOne({ postId, userId: userId });
  console.log('🔍 Existing reaction found:', !!userReaction);

  if (userReaction) {
    console.log('📝 Updating existing reaction...');
    // Update the type if reaction exists
    userReaction.type = reaction;
    await userReaction.save();
    console.log('✅ Reaction updated successfully');
  } else {
    console.log('🆕 Creating new reaction...');
    // Create new reaction
    userReaction = await ReactionModel.create({
      postId,
      userId: userId,
      type: reaction,
    });
    console.log('✅ New reaction created:', userReaction._id);

    // Add reference to Post's reactions array
    console.log('📌 Adding reaction to post...');
    await PostModel.findByIdAndUpdate(postId, {
      $addToSet: { userReactions: userReaction._id },
    });
    console.log('✅ Reaction added to post');
  }

  // Count updated reactions
  console.log('📊 Counting reactions...');
  const thumbsUpCount = await ReactionModel.countDocuments({ postId, type: 1 });
  const thumbsDownCount = await ReactionModel.countDocuments({ postId, type: 2 });
  console.log('📊 Reaction counts:', { thumbsUpCount, thumbsDownCount });

  // ✅ Update the Post document totals directly
  console.log('📝 Updating post totals...');
  await PostModel.findByIdAndUpdate(postId, {
    totalLikes: thumbsUpCount,
    totalDislikes: thumbsDownCount,
  });
  console.log('✅ Post totals updated');

  // 🗑️ CRITICAL FIX: Clear Redis cache for this post
  console.log('🗑️ Clearing Redis cache for post:', postId);
  try {
    const cacheKey = `post:${postId}`;
    await redis?.del(cacheKey);
    console.log('✅ Redis cache cleared for post:', postId);
  } catch (cacheError) {
    console.warn('⚠️ Redis cache clear error:', cacheError.message);
  }

  const reactionUpdate = {
    postId,
    thumbsUpCount,
    thumbsDownCount,
  };

  // Emit update via socket
  console.log('📡 Emitting socket update...');
  try {
    const io = getSocketIo();
    io.emit("reactionUpdated", reactionUpdate);
    console.log('✅ Socket update emitted');
  } catch (err) {
    console.warn("Socket.IO not initialized:", err.message);
  }

  console.log('✅ Reaction update completed successfully');
  console.log('📊 Final reaction counts:', reactionUpdate);

  return {
    success: true,
    message: "Reaction updated successfully.",
    reaction: reactionUpdate,
  };
},

    registerView: async (_, { postId }, {user}) => {
        console.log('👁️ REGISTER VIEW DEBUG:', { postId, user: user?.uid });
        
        if (!user) {
            console.log('❌ No user in context for view registration');
            return {
                success: false,
                message: "Not authorized to register view.",
                view: null,
            };
        }

        // Import User model to get MongoDB ObjectId
        const User = (await import('../../../../Data/UserDetails.js')).default;
        
        try {
            // Get the MongoDB user using Firebase UID
            const dbUser = await User.findOne({ uid: user.uid });
            if (!dbUser) {
                console.log('❌ User not found in database:', user.uid);
                return {
                    success: false,
                    message: "User not found.",
                    view: null,
                };
            }

            const viewerId = dbUser._id;
            console.log('👁️ Using viewer ID:', viewerId);

            // Check if view already exists to prevent duplicates
            const existingView = await View.findOne({ postId, viewerId });
            
            if (existingView) {
                console.log('👁️ View already registered for this user');
                return {
                    success: false,
                    message: "View already registered.",
                    view: null,
                };
            }

            // Save the view
            const newView = await View.create({ postId, viewerId });
            console.log('✅ New view created:', newView._id);

            // Increment totalViews in the Post model
            const updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $inc: { totalViews: 1 } },
                { new: true }
            );

            console.log("✅ Total views updated:", updatedPost?.totalViews);

            return {
                success: true,
                message: "View registered successfully.",
                view: newView
            };
            
        } catch (error) {
            console.error('❌ View registration error:', error);
            throw new Error('Failed to register view: ' + error.message);
        }
    },
        
    }
}
export default reactionAndViewResolvers;