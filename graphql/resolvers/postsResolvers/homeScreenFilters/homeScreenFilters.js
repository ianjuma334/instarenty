import mongoose from 'mongoose';
import Post from '../../../../Data/PostDetails.js';
import { buildPipeline } from './pipeline/index.js';
import { buildFilters } from './filters.js';
const homeScreenFilters = {
  Query: {
    async getFilteredPosts(_, { filters, first = 20, after }) {
      const match = await buildFilters(filters); // ✅ now async

      const pipeline = buildPipeline(match, filters, first, after);
      let posts = await Post.aggregate(pipeline);

      // For featured posts, randomization is now handled in the pipeline via $sample
      // No additional JavaScript shuffling needed

      const hasNextPage = posts.length === first;
      const endCursor = hasNextPage ? posts[posts.length - 1]._id : null;

      return {
        edges: posts.map(post => ({
          node: {
            ...post,
            id: post._id,
            isActive: post.isActive, // ✅ CRITICAL FIX: Explicitly include isActive
          },
          cursor: post._id,
        })),
        pageInfo: {
          hasNextPage,
          endCursor,
        }
      };
    }
  }
};

export default homeScreenFilters;
