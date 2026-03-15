import Post from '../Data/PostDetails.js';

export const autoExpirePosts = async () => {
  try {
    const now = new Date();

    // Find posts that have expired
    const expiredPosts = await Post.find({
      expiresAt: { $lt: now },
      isExpired: false,
      isActive: true
    });

    if (expiredPosts.length > 0) {
      // Update expired posts
      await Post.updateMany(
        {
          expiresAt: { $lt: now },
          isExpired: false,
          isActive: true
        },
        {
          $set: {
            isExpired: true,
            isActive: false,
            updatedAt: now
          }
        }
      );

      console.log(`✅ Auto-expired ${expiredPosts.length} posts`);
    }

    return expiredPosts.length;
  } catch (error) {
    console.error('❌ Error in autoExpirePosts:', error);
    return 0;
  }
};

// Function to check and expire posts (can be called manually or scheduled)
export const checkAndExpirePosts = async () => {
  const expiredCount = await autoExpirePosts();
  return expiredCount;
};