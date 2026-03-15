import { GraphQLScalarType, Kind } from 'graphql';
import { Notification } from '../../Data/NotificationDetails.js';
import User from '../../Data/UserDetails.js';
import notificationService from '../../services/notificationService.js';
import notificationQueue from '../../services/notificationQueue.js';
import { notificationTemplates, validateTemplateData } from '../../utils/notificationTemplates.js';
import pubsub, { NOTIFICATION_EVENTS } from '../pubsub.js';

/**
 * Phase 2.1: Notification Resolvers
 * GraphQL resolvers for notification operations
 */

// Simple JSON scalar resolver
const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize: (value) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      return value;
    }
  },
  parseValue: (value) => {
    return value;
  },
  parseLiteral: (ast) => {
    switch (ast.kind) {
      case Kind.STRING:
        try {
          return JSON.parse(ast.value);
        } catch (e) {
          return ast.value;
        }
      case Kind.OBJECT:
      case Kind.LIST:
        // For simplicity, return the AST value as-is for objects and arrays
        return ast.value;
      default:
        return null;
    }
  }
});

const notificationResolvers = {
  // Scalar resolvers
  JSON: jsonScalar,

  // Notification field resolvers
  Notification: {
    id: (parent) => parent._id,
    isExpired: (parent) => {
      if (!parent.expiresAt) return false;
      return new Date(parent.expiresAt) < new Date();
    }
  },

  ActionButton: {
    text: (parent) => parent.text,
    action: (parent) => parent.action,
    style: (parent) => parent.style || 'default'
  },

  ActionButtonTemplate: {
    text: (parent) => parent.text,
    action: (parent) => parent.action,
    style: (parent) => parent.style || 'default'
  },

  NotificationCategoryPreferences: {
    booking: (parent) => parent.booking ?? true,
    payment: (parent) => parent.payment ?? true,
    message: (parent) => parent.message ?? true,
    security: (parent) => parent.security ?? true,
    marketing: (parent) => parent.marketing ?? false,
    system: (parent) => parent.system ?? true
  },

  QuietHours: {
    enabled: (parent) => parent.enabled ?? false,
    startTime: (parent) => parent.startTime ?? '22:00',
    endTime: (parent) => parent.endTime ?? '08:00'
  },

  // Query resolvers
  Query: {
    // Get user notifications with pagination
    getUserNotifications: async (_, { input = {} }, { userId }) => {
      try {
        if (!userId) {
          throw new Error('Authentication required');
        }

        const {
          limit = 50,
          skip = 0,
          unreadOnly = false,
          type,
          category,
          dateFrom,
          dateTo
        } = input;

        // Build query
        let query = { userId, isDeleted: false };

        if (unreadOnly) {
          query.isRead = false;
        }

        if (type) {
          query.type = type;
        }

        if (category) {
          query.category = category;
        }

        if (dateFrom || dateTo) {
          query.createdAt = {};
          if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
          if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        // Get notifications
        const notifications = await Notification.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        // Get total count for pagination
        const totalCount = await Notification.countDocuments(query);

        // Format edges
        const edges = notifications.map(notification => ({
          node: {
            ...notification,
            id: notification._id
          },
          cursor: notification._id.toString()
        }));

        return {
          edges,
          pageInfo: {
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            hasNextPage: skip + limit < totalCount
          },
          totalCount
        };

      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw new Error('Failed to fetch notifications');
      }
    },

    // Get single notification
    getNotification: async (_, { id }, { userId }) => {
      try {
        if (!userId) {
          throw new Error('Authentication required');
        }

        const notification = await Notification.findOne({ _id: id, userId });
        
        if (!notification) {
          throw new Error('Notification not found');
        }

        return {
          ...notification.toObject(),
          id: notification._id
        };

      } catch (error) {
        console.error('Error fetching notification:', error);
        throw new Error('Failed to fetch notification');
      }
    },

    // Get unread notification count
    getUnreadNotificationCount: async (_, { userId }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }
        
        // Check if current user can access the target user's notifications
        // Handle Firebase user object structure (uses 'uid' instead of 'id' or '_id')
        const currentUserId = user.uid || user.id || user._id;
        if (userId !== currentUserId) {
          throw new Error('Unauthorized access');
        }

        const targetUserId = userId || currentUserId;
        const count = await Notification.countDocuments({
          userId: targetUserId,
          isRead: false,
          isDeleted: false
        });

        return count;

      } catch (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
    },

    // Get notification queue statistics
    getNotificationQueueStats: async () => {
      try {
        return await notificationQueue.getQueueStats();
      } catch (error) {
        console.error('Error fetching queue stats:', error);
        return {
          pending: 0,
          retrying: 0,
          failed: 0,
          delivered: 0,
          readyForRetry: 0,
          inMemoryQueue: 0,
          isProcessing: false
        };
      }
    },

    // Get available notification templates
    getNotificationTemplates: async () => {
      try {
        const templates = [];
        
        for (const [key, template] of Object.entries(notificationTemplates)) {
          templates.push({
            key,
            ...template
          });
        }

        return templates;

      } catch (error) {
        console.error('Error fetching templates:', error);
        return [];
      }
    },

    // Validate template data
    validateNotificationTemplate: async (_, { templateKey, data }) => {
      try {
        return validateTemplateData(templateKey, data);
      } catch (error) {
        console.error('Error validating template:', error);
        return {
          valid: false,
          errors: [error.message],
          missingPlaceholders: []
        };
      }
    },

    // Get user notification preferences
    getUserNotificationPreferences: async (_, { userId }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }
        
        // Check if current user can access the target user's preferences
        // Handle Firebase user object structure (uses 'uid' instead of 'id' or '_id')
        const currentUserId = user.uid || user.id || user._id;
        if (userId !== currentUserId) {
          throw new Error('Unauthorized access');
        }

        const targetUserId = userId || currentUserId;
        const dbUser = await User.findById(targetUserId);
        
        if (!dbUser) {
          throw new Error('User not found');
        }

        const preferences = dbUser.notificationPreferences || {
          enabled: true,
          categories: {
            booking: true,
            payment: true,
            message: true,
            security: true,
            marketing: false,
            system: true
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00'
          },
          sound: true,
          vibration: true
        };

        return preferences;

      } catch (error) {
        console.error('Error fetching user preferences:', error);
        throw new Error('Failed to fetch user preferences');
      }
    }
  },

  // Mutation resolvers
  Mutation: {
    // Send a notification
    sendNotification: async (_, { input }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        // Check authorization - allow sending to self for testing, or if admin
        // Handle Firebase user object structure (uses 'uid' instead of 'id' or '_id')
        const currentUserId = user.uid || user.id || user._id;
        const targetUserId = input.userId;
        
        // Debug logging
        console.log('Authorization Debug:', {
          currentUserId: currentUserId,
          targetUserId: targetUserId,
          userObject: user
        });
        
        // Handle case where currentUserId is still undefined
        if (!currentUserId) {
          throw new Error('Unable to extract user ID from authentication context');
        }
        
        // Convert both to strings for comparison
        const currentUserIdStr = currentUserId.toString();
        const targetUserIdStr = targetUserId.toString();
        
        const isAdmin = currentUserIdStr === targetUserIdStr; // Allow self-sending for testing
        
        if (!isAdmin) {
          throw new Error(`Unauthorized to send notifications. Current user: ${currentUserIdStr}, Target user: ${targetUserIdStr}`);
        }

        const result = await notificationService.sendNotification(input);

        if (result.success && pubsub) {
          // Publish real-time notification
          pubsub.publish(NOTIFICATION_EVENTS.RECEIVED, {
            notificationReceived: {
              id: result.notificationId,
              userId: input.userId,
              type: input.type,
              title: input.title,
              message: input.message,
              link: input.link,
              priority: input.priority || 'normal',
              createdAt: new Date().toISOString()
            }
          });
        }

        return {
          success: result.success,
          message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
          notificationId: result.notificationId,
          deliveryStatus: result.deliveryStatus,
          successCount: result.successCount,
          failureCount: result.failureCount
        };

      } catch (error) {
        console.error('Error sending notification:', error);
        return {
          success: false,
          message: error.message,
          notificationId: null,
          deliveryStatus: null,
          successCount: 0,
          failureCount: 0
        };
      }
    },

    // Send notification using template
    sendTemplateNotification: async (_, { input }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const templateResult = await notificationService.sendTemplateNotification(
          input.userId,
          input.templateKey,
          input.templateData,
          input.additionalOptions
        );

        return {
          success: templateResult.success,
          message: templateResult.success ? 'Template notification sent successfully' : 'Failed to send template notification',
          notificationId: templateResult.notificationId,
          deliveryStatus: templateResult.deliveryStatus,
          successCount: templateResult.successCount,
          failureCount: templateResult.failureCount
        };

      } catch (error) {
        console.error('Error sending template notification:', error);
        return {
          success: false,
          message: error.message,
          notificationId: null,
          deliveryStatus: null,
          successCount: 0,
          failureCount: 0
        };
      }
    },

    // Send bulk notifications
    sendBulkNotifications: async (_, { notifications }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const bulkResult = await notificationService.sendBulkNotifications(notifications);

        return {
          total: bulkResult.total,
          successful: bulkResult.successful,
          failed: bulkResult.failed,
          results: bulkResult.results
        };

      } catch (error) {
        console.error('Error sending bulk notifications:', error);
        return {
          total: notifications.length,
          successful: 0,
          failed: notifications.length,
          results: notifications.map(n => ({
            userId: n.userId,
            success: false,
            message: error.message,
            notificationId: null
          }))
        };
      }
    },

    // Mark notifications as read
    markNotificationsAsRead: async (_, { userId, notificationIds }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        if (userId !== currentUserId) {
          throw new Error('Unauthorized to mark these notifications as read');
        }

        const updateResult = await Notification.markAsRead(userId, notificationIds);
        const markedCount = updateResult.modifiedCount;

        return {
          success: true,
          message: `${markedCount} notifications marked as read`,
          markedCount
        };

      } catch (error) {
        console.error('Error marking notifications as read:', error);
        return {
          success: false,
          message: error.message,
          markedCount: 0
        };
      }
    },

    // Mark all notifications as read
    markAllNotificationsAsRead: async (_, { userId }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        if (userId !== currentUserId) {
          throw new Error('Unauthorized to mark these notifications as read');
        }

        const updateResult = await Notification.updateMany(
          { userId, isRead: false, isDeleted: false },
          { isRead: true, readAt: new Date() }
        );

        return {
          success: true,
          message: `${updateResult.modifiedCount} notifications marked as read`,
          markedCount: updateResult.modifiedCount
        };

      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return {
          success: false,
          message: error.message,
          markedCount: 0
        };
      }
    },

    // Delete notifications
    deleteNotifications: async (_, { userId, notificationIds }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        if (userId !== currentUserId) {
          throw new Error('Unauthorized to delete these notifications');
        }

        const deleteResult = await Notification.updateMany(
          { 
            userId, 
            _id: { $in: notificationIds },
            isDeleted: false 
          },
          { 
            isDeleted: true,
            deletedAt: new Date()
          }
        );

        return {
          success: true,
          message: `${deleteResult.modifiedCount} notifications deleted`,
          markedCount: deleteResult.modifiedCount
        };

      } catch (error) {
        console.error('Error deleting notifications:', error);
        return {
          success: false,
          message: error.message,
          markedCount: 0
        };
      }
    },

    // Retry failed notification
    retryFailedNotification: async (_, { notificationId }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const retryResult = await notificationService.retryFailedNotification(notificationId);

        return {
          success: retryResult.success,
          message: retryResult.success ? 'Notification retry successful' : 'Notification retry failed',
          deliveryStatus: retryResult.deliveryStatus,
          successCount: retryResult.successCount,
          failureCount: retryResult.failureCount
        };

      } catch (error) {
        console.error('Error retrying notification:', error);
        return {
          success: false,
          message: error.message,
          deliveryStatus: null,
          successCount: 0,
          failureCount: 0
        };
      }
    },

    // Schedule notification for future delivery
    scheduleNotification: async (_, { input, scheduledFor }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        const scheduleResult = await notificationQueue.scheduleNotification(input, new Date(scheduledFor));

        return {
          success: true,
          message: 'Notification scheduled successfully',
          notificationId: scheduleResult,
          scheduledFor
        };

      } catch (error) {
        console.error('Error scheduling notification:', error);
        return {
          success: false,
          message: error.message,
          notificationId: null,
          scheduledFor
        };
      }
    },

    // Cancel scheduled notification
    cancelScheduledNotification: async (_, { notificationId }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        const success = await notificationQueue.cancelScheduledNotification(notificationId);

        return {
          success,
          message: success ? 'Scheduled notification cancelled' : 'Failed to cancel scheduled notification'
        };

      } catch (error) {
        console.error('Error cancelling scheduled notification:', error);
        return {
          success: false,
          message: error.message
        };
      }
    },

    // Update user notification preferences
    updateNotificationPreferences: async (_, { userId, preferences }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        // Handle Firebase user object structure (uses 'uid' instead of 'id' or '_id')
        const currentUserId = user.uid || user.id || user._id;
        if (userId !== currentUserId) {
          throw new Error('Unauthorized to update these preferences');
        }

        const targetUserId = userId || currentUserId;
        const dbUser = await User.findById(targetUserId);
        if (!dbUser) {
          throw new Error('User not found');
        }

        // Update preferences
        dbUser.notificationPreferences = {
          ...dbUser.notificationPreferences,
          ...preferences
        };

        await dbUser.save();

        return true;

      } catch (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }
    },

    // Register FCM token for user
    registerFCMToken: async (_, { userId, token, deviceType, deviceName }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        if (userId !== currentUserId) {
          throw new Error('Unauthorized to register tokens for this user');
        }

        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not failed');
        }

        // Add or update FCM token
        const existingTokenIndex = user.fcmTokens.findIndex(t => t.token === token);
        
        if (existingTokenIndex >= 0) {
          // Update existing token
          user.fcmTokens[existingTokenIndex] = {
            token,
            deviceType,
            deviceName,
            isActive: true,
            lastUsed: new Date(),
            createdAt: user.fcmTokens[existingTokenIndex].createdAt || new Date()
          };
        } else {
          // Add new token
          user.fcmTokens.push({
            token,
            deviceType,
            deviceName,
            isActive: true,
            lastUsed: new Date(),
            createdAt: new Date()
          });
        }

        await user.save();

        return true;

      } catch (error) {
        console.error('Error registering FCM token:', error);
        return false;
      }
    },

    // Unregister FCM token
    unregisterFCMToken: async (_, { userId, token }, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        if (userId !== currentUserId) {
          throw new Error('Unauthorized to unregister tokens for this user');
        }

        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        // Mark token as inactive
        const tokenIndex = user.fcmTokens.findIndex(t => t.token === token);
        if (tokenIndex >= 0) {
          user.fcmTokens[tokenIndex].isActive = false;
          await user.save();
        }

        return true;

      } catch (error) {
        console.error('Error unregistering FCM token:', error);
        return false;
      }
    },

    // Process notification queue
    processNotificationQueue: async (_, __, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        // Add admin check here in a real implementation
        const queueResult = await notificationQueue.processQueue();

        return {
          success: true,
          message: 'Queue processing completed',
          processed: queueResult.processed,
          successful: queueResult.successful,
          failed: queueResult.failed,
          retried: queueResult.retried,
          errors: queueResult.errors || []
        };

      } catch (error) {
        console.error('Error processing queue:', error);
        return {
          success: false,
          message: error.message,
          processed: 0,
          successful: 0,
          failed: 0,
          retried: 0,
          errors: [{ error: error.message }]
        };
      }
    },

    // Clean up old notifications
    cleanupOldNotifications: async (_, __, { userId: currentUserId }) => {
      try {
        if (!currentUserId) {
          throw new Error('Authentication required');
        }

        // Add admin check here in a real implementation
        const cleanupResult = await notificationQueue.cleanup();

        return {
          success: true,
          message: 'Cleanup completed',
          deliveredDeleted: cleanupResult.deliveredDeleted,
          failedDeleted: cleanupResult.failedDeleted,
          inMemoryCleaned: cleanupResult.inMemoryCleaned
        };

      } catch (error) {
        console.error('Error during cleanup:', error);
        return {
          success: false,
          message: error.message,
          deliveredDeleted: 0,
          failedDeleted: 0,
          inMemoryCleaned: 0
        };
      }
    },

    // Create custom notification template
    createNotificationTemplate: async (_, { key, template }) => {
      try {
        // Add admin check here in a real implementation
        const success = notificationTemplates.createCustomTemplate(key, template);
        return success;

      } catch (error) {
        console.error('Error creating template:', error);
        return false;
      }
    },

    // Update notification template
    updateNotificationTemplate: async (_, { key, updates }) => {
      try {
        // Add admin check here in a real implementation
        const success = notificationTemplates.updateTemplate(key, updates);
        return success;

      } catch (error) {
        console.error('Error updating template:', error);
        return false;
      }
    },

    // Delete custom notification template
    deleteNotificationTemplate: async (_, { key }) => {
      try {
        // Add admin check here in a real implementation
        const success = notificationTemplates.deleteTemplate(key);
        return success;

      } catch (error) {
        console.error('Error deleting template:', error);
        return false;
      }
    }
  },

  // Subscription resolvers
  Subscription: {
    // Real-time notification subscription
    notificationReceived: {
      subscribe: (_, { userId }, { userId: currentUserId }) => {
        if (userId !== currentUserId) {
          throw new Error('Unauthorized to subscribe to this user\'s notifications');
        }
        if (!pubsub) {
          throw new Error('PubSub not available');
        }
        return pubsub.asyncIterator([NOTIFICATION_EVENTS.RECEIVED]);
      }
    },

    // Notification status updates
    notificationStatusUpdate: {
      subscribe: (_, { userId, notificationId }, { userId: currentUserId }) => {
        if (userId !== currentUserId) {
          throw new Error('Unauthorized to subscribe to this user\'s notification updates');
        }
        if (!pubsub) {
          throw new Error('PubSub not available');
        }
        return pubsub.asyncIterator([`${NOTIFICATION_EVENTS.STATUS_UPDATE}:${notificationId}`]);
      }
    }
  }
};

export default notificationResolvers;