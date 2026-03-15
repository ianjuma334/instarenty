import Post from '../../../Data/PostDetails.js';
import Amenity from '../../../Data/AmenityDetails.js';
import {User} from '../../../Data/UserDetails.js';
import SystemAccount from '../../../Data/SystemAccountDetails.js';
import MoneyFlow from '../../../Data/MoneyFlowDetails.js';
import fs from 'fs';
import path from 'path';
import { paginateResults } from '../../../utils/paginate.js';
import { getSocketIo } from '../../../services/socket.js';
import { formatPaginatedPosts, formatPost } from '../../../utils/formatPost.js';
import Institution from '../../../Data/InstitutionsDetails.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// ✅ NEW: Helper function to sync revenue to unified account
const syncToUnifiedRevenue = async (category, amount) => {
  const directRevenueCategories = ['booking_fee', 'featured_fee', 'registration_fee'];
  const holdingCategories = ['post_upload_holding']; // These should NOT sync to unified revenue yet
  
  // Only sync direct revenue, NOT holding accounts
  if (directRevenueCategories.includes(category) && !holdingCategories.includes(category)) {
    await SystemAccount.findOneAndUpdate(
      { type: 'revenue_total' },
      { $inc: { balance: amount } },
      { upsert: true, new: true }
    );
  }
};

// const saveFile = async (upload) => {
//   if (!upload) return null;

//   const { createReadStream, filename } = await upload;
//   if (!filename) throw new Error("No filename received in the upload");

//   const uploadDir = path.join(__dirname, "../uploads");
//   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

//   const filePath = path.join(uploadDir, filename);

//   await new Promise((resolve, reject) => {
//     createReadStream()
//       .pipe(fs.createWriteStream(filePath))
//       .on("finish", resolve)
//       .on("error", reject);
//   });

//   return filePath.replace(/\\/g, "/");
// };

const corePostResolvers = {

    Post: {
    postgps: (post) => {
      if (!post.postgps) return null;
      return {
        latitude: post.postgps.coordinates[1],
        longitude: post.postgps.coordinates[0],
      };
    }
  },

  Query: {

institutions: async () => await Institution.find({}),
institutionByName: async (_, { name }) => {
  return await Institution.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") }
  });
},

post: async (_, { id }, { redis }) => {
  try {
    // ⚡ Create cache key for this post
    const cacheKey = `post:${id}`;

    try {
      // ⚡ Try to get from cache first
        const cachedPost = await redis?.get(cacheKey);
        if (cachedPost) {
          console.log('🚀 Single post query served from cache');
          const parsed = JSON.parse(cachedPost);
          
          // 🔍 DEBUG: Check cached data
          console.log('🔍 CACHED POST DEBUG:', {
            id: parsed.id,
            totalLikes: parsed.totalLikes,
            totalDislikes: parsed.totalDislikes,
            averageRatings: parsed.averageRatings,
            numberOfVacancies: parsed.numberOfVacancies
          });
          
          return parsed;
        }
      } catch (cacheError) {
        console.warn('⚠️ Post cache read error:', cacheError.message);
      }

    // Fetch post and populate related fields
    const post = await Post.findById(id)
      .populate('amenities.amenity')
      .populate({ path: 'userId', select: 'fname lname phone username image createdAt' });

    if (!post) throw new Error('Post not found');

    // Merge top-level images (image, image2, image3) with `images` object
    const allImages = {
      BedRoom: post.image || null,
      BedRoom2: post.image2 || null,
      BedRoom3: post.image3 || null,
      ...(post.images ? Object.fromEntries(post.images) : {}),
    };

    // Convert workerImages Map into a plain object dynamically
    const allWorkerImages = post.workerImages
      ? Object.fromEntries(post.workerImages)
      : { ownerwithProperty: null, photowithOwner: null };

    // Format amenities correctly for GraphQL
    const amenities = post.amenities.map(a => ({
      amenity: {
        id: a.amenity?._id.toString() || null,
        name: a.amenity?.name || null,
        type: a.amenity?.type || null,
        options: a.amenity?.options || [],
      },
      value: a.value || null,
    }));

    // Construct formatted post object with postgps included
    const formattedPost = {
      id: post._id.toString(),
      rent: post.rent,
      county: post.county,
      subCounty: post.subCounty,
      ward: post.ward,
      type: post.type,
      deposite: post.deposite,
      refundable: post.refundable,
      photosAvailable: post.photosAvailable,
      numberOfVacancies: post.numberOfVacancies,
      termsAndConditions: post.termsAndConditions,
      isActive: post.isActive, // ✅ CRITICAL FIX: Include isActive field
      amenities,
      images: allImages,
      workerImages: allWorkerImages, // ✅ dynamically included workerImages
      userId: post.userId || { fname: 'Unknown', lname: '', _id: null, image: null },
      averageRatings: post.averageRatings || 0,
      totalLikes: post.totalLikes || 0,
      totalDislikes: post.totalDislikes || 0,
      totalViews: post.totalViews || 0,
      userReactions: post.userReactions || [],

      // Map GeoJSON into GraphQL-friendly format
      postgps: post.postgps
        ? {
            latitude: post.postgps.coordinates[1],
            longitude: post.postgps.coordinates[0],
          }
        : null,
    };

    // 🔍 DEBUG: Check fresh database data
    console.log('🔍 FRESH POST DEBUG:', {
      id: formattedPost.id,
      totalLikes: formattedPost.totalLikes,
      totalDislikes: formattedPost.totalDislikes,
      averageRatings: formattedPost.averageRatings,
      numberOfVacancies: formattedPost.numberOfVacancies,
      postId: id
    });

    // ⚡ Cache the formatted post for 10 minutes (posts don't change often)
    try {
      await redis?.setex(cacheKey, 600, JSON.stringify(formattedPost));
      console.log('💾 Post cached successfully');
    } catch (cacheError) {
      console.warn('⚠️ Post cache write error:', cacheError.message);
    }

    return formattedPost;
  } catch (error) {
    console.error('Error fetching post:', error);
    throw new Error('Error fetching post. Please try again later.');
  }
},



userPosts: async (_, { userId, after, limit = 10 }, { user }) => {
  if (!user) {
    return {
      success: false,
      message: "Unauthorized access. Please log in.",
      posts: [],
    };
  }

  const dbUser = await User.findOne({ uid: user.uid });
  if (!dbUser) {
    return {
      success: false,
      message: "User not found.",
      posts: [],
    };
  }

  const filterUserId = userId || dbUser._id;

  try {
    const paginated = await paginateResults({
      model: Post,
      after,
      limit,
      filter: { userId: filterUserId },
      populate: [
        { path: "userId", select: "fname lname phone username image createdAt" },
        { path: "amenities.amenity" },
      ],
    });

    return formatPaginatedPosts(paginated);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return {
      success: false,
      message: "Failed to retrieve user posts",
      error,
    };
  }
},

    
    posts: async (_, { first , after }, { redis }) => { // PAGINATION HAVE IT AS 10 AS DEFAULT
          // ⚡ Create cache key for this query
          const cacheKey = `posts:${first}:${after || 'start'}`;
   
          try {
            // ⚡ Try to get from cache first
            const cachedResult = await redis?.get(cacheKey);
            if (cachedResult) {
              console.log('🚀 Posts query served from cache');
              return JSON.parse(cachedResult);
            }
          } catch (cacheError) {
            console.warn('⚠️ Cache read error:', cacheError.message);
          }
   
          const query = {};
   
          if (after) {
            query._id = { $lt: after }; // assuming descending order by _id
          }
   
          const posts = await Post.find(query)
            .sort({ _id: -1 })
            .limit(first + 1) // fetch one extra to check for next page
            .populate('amenities.amenity')
            .populate('userId')
            .populate('isApprovedBy');
   
          const hasNextPage = posts.length > first;
          const slicedPosts = hasNextPage ? posts.slice(0, first) : posts;
   
          const result = {
            edges: slicedPosts.map(post => ({
              node: {
                ...post._doc,
                id: post._id,
                isActive: post.isActive, // ✅ CRITICAL FIX: Explicitly include isActive
                amenities: post.amenities.map(a => ({
                  amenity: a.amenity?._id,
                  name: a.amenity?.name || null,
                  type: a.amenity?.type || null,
                  value: a.value
                }))
              },
              cursor: post._id,
            })),
            pageInfo: {
              hasNextPage,
              endCursor: hasNextPage ? posts[first - 1]._id : null,
            }
          };
   
          // ⚡ Cache the result for 5 minutes
          try {
            await redis?.setex(cacheKey, 300, JSON.stringify(result));
          } catch (cacheError) {
            console.warn('⚠️ Cache write error:', cacheError.message);
          }
   
          return result;
        }

    
    
    
  },
  Mutation: {
createPost: async (_, { input }, { user }) => {
  if (!user) {
    return {
      success: false,
      message: 'Unauthorized access. Only landlords can create posts.',
      post: null,
      needsDeposit: false,
      shortfall: 0
    };
  }

  const dbUser = await User.findOne({ uid: user.uid });
  if (!dbUser || dbUser.role !== 'landlord') {
    return {
      success: false,
      message: 'Unauthorized access. Only landlords can create posts.',
      post: null,
      needsDeposit: false,
      shortfall: 0
    };
  }

  try {
    const {
      county, subCounty, ward, type, rent, deposite, refundable, numberOfUnits,
      numberOfVacancies, termsAndConditions, postgps,
      amenities
    } = input;

    console.log('Input:', input.postgps);

    // Validate GPS coordinates before any payment processing
    if (postgps) {
      const { latitude, longitude } = postgps;

      // Check if coordinates are provided and are numbers
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return {
          success: false,
          message: 'Invalid GPS coordinates. Latitude and longitude must be valid numbers.',
          post: null,
          needsDeposit: false,
          shortfall: 0
        };
      }

      // Check coordinate bounds
      if (latitude < -90 || latitude > 90) {
        return {
          success: false,
          message: 'Invalid latitude. Must be between -90 and 90 degrees.',
          post: null,
          needsDeposit: false,
          shortfall: 0
        };
      }

      if (longitude < -180 || longitude > 180) {
        return {
          success: false,
          message: 'Invalid longitude. Must be between -180 and 180 degrees.',
          post: null,
          needsDeposit: false,
          shortfall: 0
        };
      }

      // Check for null/undefined values that might slip through
      if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
        return {
          success: false,
          message: 'GPS coordinates cannot be null or NaN.',
          post: null,
          needsDeposit: false,
          shortfall: 0
        };
      }
    }

    // Get fees
    const { getFees } = await import('../../../services/feesService.js');
    const fees = getFees();
    const postUploadFee = fees.postUploadFee;

    // Check if landlord has sufficient balance
    const landlord = dbUser;
    if (landlord.accountBalance < postUploadFee) {
      const shortfall = postUploadFee - landlord.accountBalance;
      return {
        success: false,
        message: `Insufficient balance for post upload fee. You need KES ${shortfall} more. Current balance: KES ${landlord.accountBalance}, Required: KES ${postUploadFee}.`,
        post: null,
        needsDeposit: true,
        shortfall: shortfall
      };
    }

    // Deduct fee from landlord
    landlord.accountBalance -= postUploadFee;
    await landlord.save();

    // No system account updates - direct transaction handling

    // Create transaction record
    const Transaction = await import('../../../Data/TransactionDetails.js');
    const transaction = new Transaction.default({
      userId: dbUser._id,
      type: 'debit',
      amount: postUploadFee,
      balanceAfter: landlord.accountBalance,
      status: 'completed',
      paymentMethod: 'wallet',
      purpose: 'Post upload fee',
    });
    await transaction.save();

    // Deposit fee to revenue_post_holding account
    const holdingAccount = await SystemAccount.findOneAndUpdate(
      { type: 'revenue_post_holding' },
      { $inc: { balance: postUploadFee } },
      { new: true, upsert: true }
    );

    // Format amenities
    const formattedAmenities = amenities?.map(({ amenityId, value }) => ({
      amenity: amenityId,
      value,
      confirmed:false
    })) || [];

    // ✅ Transform GPS into GeoJSON Point
    const geoPoint = postgps
      ? {
          type: "Point",
          coordinates: [postgps.longitude, postgps.latitude] // order matters!
        }
      : undefined;

    console.log("geopoint",geoPoint)

    const post = new Post({
      userId: dbUser._id,
      county,
      subCounty,
      ward,
      type,
      rent,
      deposite,
      refundable,
      numberOfUnits,
      numberOfVacancies,
      termsAndConditions,
      postgps: geoPoint,
      amenities: formattedAmenities
    });

    const newPost = await post.save();

    // Record MoneyFlow for tracking after post is created (money going to holding, not income yet)
    const moneyFlow = new MoneyFlow({
      type: 'holding',
      category: 'post_upload_holding',
      amount: postUploadFee,
      description: `Post upload fee held for post ${newPost._id} (becomes income after approval)`,
      userId: dbUser._id,
      postId: newPost._id,
    });
    await moneyFlow.save();

    // ✅ REMOVED: Don't sync to unified revenue - money goes to holding account first

    return {
      success: true,
      message: 'Post created successfully.',
      post: newPost,
      needsDeposit: false,
      shortfall: 0
    };

  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while creating the post.',
      post: null,
      needsDeposit: false,
      shortfall: 0
    };
  }
}

,
    deletePost: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error('Unauthorized access. Only landlords can delete posts.');
      }
    
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || (dbUser.role !== 'landlord' && dbUser.role !== 'admin')) {
        throw new Error('Unauthorized access. Only landlords can delete posts.');
      }
    
      const post = await Post.findById(id);
      if (!post) throw new Error('Post not found');
    
      if (post.userId.toString() !== dbUser._id.toString() && dbUser.role !== 'admin') {
        throw new Error('Unauthorized access. You can only delete your own posts.');
      }

     // await Post.deleteOne({ _id: id });

      try {
        const io = getSocketIo();
        io.emit('postDeleted', { postId: id });
      } catch (err) {
        console.warn('Socket.IO not initialized:', err.message);
      }

      return { success: true, message: `Post with ID ${id} has been deleted.` };
    },
    updatePost: async (_, { id, input }, { redis }) => {
      console.log('🔄 UPDATE POST DEBUG:', { postId: id, input, timestamp: new Date().toISOString() });
      
      const post = await Post.findById(id);
      if (!post) throw new Error('Post not found');
      
      console.log('🔍 BEFORE UPDATE - Current post numberOfVacancies:', post.numberOfVacancies);
    
      // Update only the fields provided
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`📝 Updating field: ${key} = ${value}`);
          post[key] = value;
        }
      });
    
      const updatedPost = await post.save();
      
      console.log('✅ AFTER UPDATE - New post numberOfVacancies:', updatedPost.numberOfVacancies);
      
      // 🗑️ CRITICAL FIX: Clear Redis cache for the updated post
      console.log('🗑️ Clearing Redis cache for post (update):', id);
      try {
        const cacheKey = `post:${id}`;
        await redis?.del(cacheKey);
        console.log('✅ Redis cache cleared for post (update):', id);
      } catch (cacheError) {
        console.warn('⚠️ Redis cache clear error (update):', cacheError.message);
      }
    
      // Optionally emit a socket event
      const io = getSocketIo();
      if (io) {
        io.emit('postUpdated', updatedPost);
      }
    
      return updatedPost;
    },
    activatePost: async (_, { postId }, { user, redis }) => {
      console.log('🔄 ACTIVATE POST DEBUG:', { postId, timestamp: new Date().toISOString() });
      
      if (!user) {
        return {
          success: false,
          message: 'Only landlords can activate posts.',
        };
      }
    
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || dbUser.role !== 'landlord' ) {
        return {
          success: false,
          message: 'Only landlords can activate posts.',
        };
      }
    
      const post = await Post.findById(postId);
      if (!post) throw new Error('Post not found');
    
      const landlord = post.userId.toString();
      
      console.log('🔍 BEFORE ACTIVATE - Current post isActive:', post.isActive);
    
      if(landlord !== dbUser._id.toString()){
        return {
          success: false,
          message: 'You can only activate your own posts.',
        };
      }
      
      if(post.isActive){
        return {
          success: false,
          message: 'Post is already active.',
        };
      }

      post.isActive = true;
      await post.save();
      
      console.log('✅ AFTER ACTIVATE - New post isActive:', post.isActive);
      
      // 🗑️ CRITICAL FIX: Clear Redis cache for the activated post
      console.log('🗑️ Clearing Redis cache for post (activate):', postId);
      try {
        const cacheKey = `post:${postId}`;
        await redis?.del(cacheKey);
        console.log('✅ Redis cache cleared for post (activate):', postId);
      } catch (cacheError) {
        console.warn('⚠️ Redis cache clear error (activate):', cacheError.message);
      }
      
      // Emit socket event for real-time updates
      try {
        const io = getSocketIo();
        if (io) {
          io.emit('postActivated', { postId, isActive: true });
        }
      } catch (err) {
        console.warn('Socket.IO not initialized:', err.message);
      }
    
      return {
        success: true,
        message: 'Post activated successfully.'
      }
    
  },
    deactivatePost: async (_, { postId }, { user, redis }) => {
      console.log('🔄 DEACTIVATE POST DEBUG:', { postId, timestamp: new Date().toISOString() });
      
      if (!user) {
        return {
          success: false,
          message: 'Only landlords can deactivate posts.',
        };
      }
    
      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || dbUser.role !== 'landlord' ) {
        return {
          success: false,
          message: 'Only landlords can deactivate posts.',
        };
      }
    
      const post = await Post.findById(postId);
      if (!post) throw new Error('Post not found');
    
      const landlord = post.userId.toString();
      
      console.log('🔍 BEFORE DEACTIVATE - Current post isActive:', post.isActive);
    
    
      if(landlord !== dbUser._id.toString()){
        return {
          success: false,
          message: 'You can only deactivate your own posts.',
        };
      }
      
      if(!post.isActive){
        return {
          success: false,
          message: 'Post is already inactive.',
        };
      }

      post.isActive = false;
      await post.save();
      
      console.log('✅ AFTER DEACTIVATE - New post isActive:', post.isActive);
      
      // 🗑️ CRITICAL FIX: Clear Redis cache for the deactivated post
      console.log('🗑️ Clearing Redis cache for post (deactivate):', postId);
      try {
        const cacheKey = `post:${postId}`;
        await redis?.del(cacheKey);
        console.log('✅ Redis cache cleared for post (deactivate):', postId);
      } catch (cacheError) {
        console.warn('⚠️ Redis cache clear error (deactivate):', cacheError.message);
      }
      
      // Emit socket event for real-time updates
      try {
        const io = getSocketIo();
        if (io) {
          io.emit('postDeactivated', { postId, isActive: false });
        }
      } catch (err) {
        console.warn('Socket.IO not initialized:', err.message);
      }
    
      return {
        success: true,
        message: 'Post deactivated successfully.'
      }
    
  },
  uploadPostImages: async (_, { postId, images }, { user }) => {
    if (!user) {
      throw new Error('Unauthorized. Only landlords can upload post images.');
    }
  
    const dbUser = await User.findOne({ uid: user.uid });
    if (!dbUser || dbUser.role !== 'landlord') {
      throw new Error('Unauthorized. Only landlords can upload post images.');
    }
  
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
  
    if (post.userId.toString() !== dbUser._id.toString()) {
      throw new Error('You can only upload images for your own posts.');
    }

    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('No images provided.');
    }
  
    // Instead of image1, image2, etc., use the label
    const imageUpdates = {};
  
    images.forEach(({ label, url }) => {
      imageUpdates[label] = url;
    });
  
    post.images = imageUpdates;
    post.photosAvailable = true;

    await post.save();

    return {
      success: true,
      message: 'Images linked to post successfully.',
      post,
    };
  },
  uploadPostConfirmImages: async (_, { postId, workerImages }, { user }) => {
    if (!user) {
      throw new Error('Unauthorized. Only workers can upload post images.');
    }

    const dbUser = await User.findOne({ uid: user.uid });
    if (!dbUser || dbUser.role !== 'worker') {
      throw new Error('Unauthorized. Only workers can upload post images.');
    }

    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');


    if (!Array.isArray(workerImages) || workerImages.length === 0) {
      throw new Error('No images provided.');
    }

    // ✅ REMOVED: Worker payment logic moved to admin approval
    // Worker payment should only happen during admin approval, not during confirmation

    // Instead of image1, image2, etc., use the label
    const imageUpdates = {};

    workerImages.forEach(({ label, url }) => {
      imageUpdates[label] = url;
    });

    post.workerImages = imageUpdates;
    post.isConfirmed = true;
    post.isConfirmedBy = dbUser._id;

    await post.save();

    return {
      success: true,
      message: 'Images linked to post successfully.',
      post,
    };
  },  
}
};

export default corePostResolvers;
