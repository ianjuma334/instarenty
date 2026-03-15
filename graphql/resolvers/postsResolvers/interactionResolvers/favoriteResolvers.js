
import Post from '../../../../Data/PostDetails.js';
import Favorite from '../../../../Data/FavoriteDetails.js';
import { paginateResults } from '../../../../utils/paginate.js';
import { formatPaginatedPosts, formatPost } from '../../../../utils/formatPost.js';


const favoriteResolvers = {
    Query : {
myFavorites: async (_, { after, limit = 10 }, { user }) => {
  if (!user) {
    return { success: false, message: "Not authorized to view favorites" };
  }

  try {
    const favorites = await Favorite.find({ userId: user.id }).select("postId");
    const postIds = favorites.map((fav) => fav.postId);

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


    },
    Mutation:{
        addToFavorites: async (_, { postId }, { user }) => {
            if (!user) {
              return { success: false, message: "Not authorized to add to favorites" };
            }
          
            const exists = await Favorite.findOne({ userId: user.id, postId: postId });
            if (exists) return { success: false, message: "Already in favorites" };
          
            await Favorite.create({  userId: user.id, postId: postId });
            return { success: true, message: "Post added to favorites" };
          },
        removeFromFavorites: async (_, { postId }, { user }) => {
        if (!user) {
            return { success: false, message: "Not authorized to add to favorites" };
        }
    
        const exists = await Favorite.findOne({ userId: user.id, postId: postId });
        if (!exists) return { success: false, message: "Not in favorites" };
        
        await Favorite.findOneAndDelete({ userId: user.id, postId: postId });
        return { success:true, message: "Removed from favorite" };
        },   
    
    }
}
export default favoriteResolvers;