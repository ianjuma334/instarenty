import { User } from '../../../Data/UserDetails.js'; 
import  Post  from '../../../Data/PostDetails.js';
import Report from '../../../Data/ReportDetails.js'; 


const resolvers = {
  Query: {
    getReports: async (_, __, { user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || dbUser.role !== 'customerCare' && dbUser.role !== 'admin') {
        throw new Error("Unauthorized");
      }
      return await Report.find().populate("reporter reported handledBy");
    },
    
    getReportById: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || dbUser.role !== 'customerCare' && dbUser.role !== 'admin') {
        throw new Error("Unauthorized");
      }
      const report = await Report.findById(id).populate("reporter reported handledBy");
      if (!report) {
        throw new Error("Report not found");
      }
      return report;
    },
    
    getReportsByReporter: async (_, { reporterId }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return await Report.find({ reporter: reporterId }).populate("reporter reported handledBy");
    },
    
    getReportsByReported: async (_, { reportedId }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return await Report.find({ reported: reportedId }).populate("reporter reported handledBy");
    }
  },

  Mutation: {
    createReport: async (_, { input }, { user }) => {
      if (!user) {
        return {
          success: false,
          message: "Unauthorized",
          report: null
        };
      }
      const { reported, reason } = input;

      // Ensure the reporter and reported are different
      if (user.id === reported) {
        return {
          success: false,
          message: "You cannot report yourself.",
          report: null
        };
      }

      const reportedUser = await User.findById(reported);
      if (!reportedUser) {
        return {
          success: false,
          message: "Reported user not found.",
          report: null
        };
      }

      const report = new Report({
        reporter: user.id,
        reported: reported,
        reason: reason
      });

      const savedReport = await report.save();

      if(reportedUser.reportedBy.includes(user.id)) {
        return {
          success: true,
          message: "You have already reported this user. please update your report if there is mo",
          report: savedReport
        };
      }

      if (reportedUser.reportCount === 2) {

        reportedUser.reportedBy.push(user.id);
        reportedUser.reportCount += 1;
        reportedUser.isFlagged = true;

        await Post.updateMany({ userId: reportedUser.id }, { $set: { isFlagged: true } });

        await reportedUser.save();
        return {
          success: true,
          message: "Report submitted successfully. User is now flagged.",
          report: savedReport
        };
      }

      // Update the reported user's `reportedBy` and `reportCount`
      reportedUser.reportedBy.push(user.id);
      reportedUser.reportCount += 1;

      // Save the updated reported user
      await reportedUser.save();

      return {
        success: true,
        message: "Report submitted successfully.",
        report: savedReport
      };
    },

    updateReport: async (_, { id, input }, { user }) => {
      if (!user) {
        return {
          success: false,
          message: "Not authorized to update reports.",
          report: null
        };
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || dbUser.role !== 'customerCare' && dbUser.role !== 'admin' && dbUser.role !== 'AssistantAdmin') {
        return {
          success: false,
          message: "Not authorized to update reports.",
          report: null
        };
      }

      const report = await Report.findById(id);
      if (!report) {
        return {
          success: false,
          message: "Report not found.",
          report: null
        };
      }

      if(report.status === 'solved') {
        return {
          success: false,
          message: "Report already solved.",
          report: null
        };
      }

      if(report.status === 'in progress') {
        if(user !== report.handledBy) {
          return {
            success: false,
            message: "Report is already being handled by another user.",
            report: null
          };
        }
        return {
          success: false,
          message: "Report is still pending.",
          report: null
        };
      }

      report.status = input.status;
      report.solutionNote = input.solutionNote;
      report.handledBy = user.id;

      const updatedReport = await report.save();
      return {
        success: true,
        message: "Report updated successfully.",
        report: updatedReport
      };
    }
  }
};

export default resolvers;
