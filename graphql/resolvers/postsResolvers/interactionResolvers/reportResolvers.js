import Report from '../../../../Data/ReportDetails.js';
import Post from '../../../../Data/PostDetails.js';
import Booking from '../../../../Data/BookingDetails.js';
import { User } from '../../../../Data/UserDetails.js';

const reportResolvers = {
    Mutation:{
        reportPost: async (_, { postId, reason }, {user}) => {

            if (!user ) {
              return {
                success: false,
                message: "Not authorized to report post.",
              };
            }

            let post = await Post.findById(postId);
            if (!post) {
              return {
                success: false,
                message: "Post not found.",
              };
            }

            let bookedPost = await Booking.findOne({postId, userId:user.id});

            if (!bookedPost) {
              return {
                success: false,
                message: "Not authorized to report this post. You need to have booked this post first.",
              };
            }

            // Check if user already reported this post
            let existingReport = await Report.findOne({postId, userId:user.id});

            if (existingReport) {
              return {
                success: false,
                message: "You have already reported this post.",
              };
            }

            const newReport = await Report.create({ postId, userId:user.id, reason });

            return{
              success: true,
              message: "Report submitted successfully.",
            }

          },
    }
}

export default reportResolvers;