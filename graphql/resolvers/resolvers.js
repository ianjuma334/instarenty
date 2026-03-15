import userResolvers from './usersResolvers/usersResolvers.js';
import adminUserResolvers from './usersResolvers/adminUserResolvers.js';
import transactionResolvers from './transactionResolvers/transactionResolvers.js';
import reportResolvers from './usersResolvers/reportResolver.js'
import postResolvers from './postsResolvers/index.js'; // or just './postsResolvers'
import { adminFilterResolvers } from './usersResolvers/adminUserFilter/results.js';
import searchUsers from './usersResolvers/searchUsers.js';
import uploadResolvers from './testUploadResolvers.js'; 
//import mpesaResolvers from './mpesaResolver.js';
import { feesResolvers } from './feesResolver/feesResolver.js';
import { amenityResolvers } from './amenities.js';
import sub from './subscription/sub.js';
import subResolvers from './subscription/subResolvers.js';
import messageResolvers from './subscription/messageResolvers.js';
import notificationResolvers from './notificationResolvers.js';

import mpesaResolvers from '../../mpesa/mpesaResolver.js';
import systemAccountResolvers from './systemAccountResolvers.js';
import moneyFlowResolvers from './moneyFlowResolvers.js';
import dashboardResolvers from './dashboardResolvers.js';


export default {
  Query: {
    ...searchUsers.Query,

    ...mpesaResolvers.Query,
    ...adminFilterResolvers.Query,
    ...userResolvers.Query,
    ...reportResolvers.Query,
    ...transactionResolvers.Query,
    ...adminUserResolvers.Query,
    ...postResolvers.Query,
    ...feesResolvers.Query,
    ...amenityResolvers.Query,
    ...sub.Query,
    ...subResolvers.Query,
    ...messageResolvers.Query,
    ...systemAccountResolvers.Query,
    ...moneyFlowResolvers.Query,
    ...dashboardResolvers.Query,
    ...notificationResolvers.Query
  },
  Mutation: {

    ...mpesaResolvers.Mutation,
    ...userResolvers.Mutation,
    ...uploadResolvers.Mutation,
    ...reportResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...adminUserResolvers.Mutation,
    ...postResolvers.Mutation,
    ...feesResolvers.Mutation,
    ...amenityResolvers.Mutation,
    ...sub.Mutation,
    ...subResolvers.Mutation,
    ...messageResolvers.Mutation,
    ...systemAccountResolvers.Mutation,
    ...moneyFlowResolvers.Mutation,
    ...notificationResolvers.Mutation
  },

  Subscription:{
    ...subResolvers.Subscription,
    ...messageResolvers.Subscription,
    ...mpesaResolvers.Subscription,
    ...notificationResolvers.Subscription
  },

  // Custom scalar types
  JSON: notificationResolvers.JSON,

  // Notification-related field resolvers
  Notification: notificationResolvers.Notification,
  ActionButton: notificationResolvers.ActionButton,
  ActionButtonTemplate: notificationResolvers.ActionButtonTemplate,
  NotificationCategoryPreferences: notificationResolvers.NotificationCategoryPreferences,
  QuietHours: notificationResolvers.QuietHours
};
