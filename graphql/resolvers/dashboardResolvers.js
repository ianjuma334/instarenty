import { User } from '../../Data/UserDetails.js';
import Post from '../../Data/PostDetails.js';
import Report from '../../Data/ReportDetails.js';

const dashboardResolvers = {
  Query: {
    getDashboardStats: async (_, __, { user }) => {
      try {
        console.log('🔍 Dashboard stats query called', { user: user?.uid });
        
        // Check if user is logged in (less restrictive for now)
        if (!user) {
          console.log('⚠️ No user found, returning zeros');
          return {
            totalUsers: 0,
            activePosts: 0,
            totalPosts: 0,
            totalReports: 0,
            pendingReports: 0,
          };
        }

        console.log('✅ User authenticated, fetching stats...');

        // Get total users count
        const totalUsers = await User.countDocuments();
        console.log('📊 Total users:', totalUsers);

        // Get total posts count
        const totalPosts = await Post.countDocuments();
        console.log('📊 Total posts:', totalPosts);

        // Get active posts count
        const activePosts = await Post.countDocuments({ isActive: true });
        console.log('📊 Active posts:', activePosts);

        // Get total reports count
        const totalReports = await Report.countDocuments();
        console.log('📊 Total reports:', totalReports);

        // Get pending reports count
        const pendingReports = await Report.countDocuments({ status: 'pending' });
        console.log('📊 Pending reports:', pendingReports);

        const result = {
          totalUsers,
          activePosts,
          totalPosts,
          totalReports,
          pendingReports,
        };

        console.log('✅ Dashboard stats result:', result);
        return result;
      } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        // Return zeros on error instead of throwing
        return {
          totalUsers: 0,
          activePosts: 0,
          totalPosts: 0,
          totalReports: 0,
          pendingReports: 0,
        };
      }
    },
  },
};

export default dashboardResolvers;