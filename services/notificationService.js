import admin from 'firebase-admin';
import { Notification, NOTIFICATION_TYPES, DELIVERY_STATUS, PRIORITY_LEVELS } from '../Data/NotificationDetails.js';
import User from '../Data/UserDetails.js';
import { notificationTemplates } from '../utils/notificationTemplates.js';

/**
 * Phase 2.1: Server-Side Notification Service
 * Handles Firebase Cloud Messaging (FCM) push notifications
 * with delivery tracking, retry logic, and user preferences
 */
class NotificationService {
  constructor() {
    this.firebaseAdmin = admin;
    this.messaging = admin.messaging();
  }

  /**
   * Send a notification to a specific user
   * @param {Object} params - Notification parameters
   * @param {string} params.userId - Recipient user ID (Firebase UID or MongoDB ObjectId)
   * @param {string} params.type - Notification type (booking, payment, etc.)
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {Object} params.data - Additional data payload
   * @param {string} params.link - Optional deep link
   * @param {string} params.priority - Priority level
   * @param {Array} params.actionButtons - Optional action buttons
   * @returns {Promise<Object>} Result with notification ID and delivery status
   */
  async sendNotification({
    userId,
    type = NOTIFICATION_TYPES.SYSTEM,
    title,
    message,
    data = {},
    link = null,
    priority = PRIORITY_LEVELS.NORMAL,
    actionButtons = []
  }) {
    let notification = null; // Declare notification variable in outer scope
    
    try {
      // Get user by Firebase UID or MongoDB ObjectId
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check if notifications are enabled for this user
      if (!user.notificationPreferences?.enabled) {
        return {
          success: false,
          reason: 'User has notifications disabled',
          notificationId: null
        };
      }

      // Check category preferences
      const categoryPreferences = user.notificationPreferences?.categories;
      if (categoryPreferences && !categoryPreferences[type]) {
        return {
          success: false,
          reason: `User has ${type} notifications disabled`,
          notificationId: null
        };
      }

      // Check quiet hours
      if (this.isInQuietHours(user.notificationPreferences?.quietHours)) {
        return {
          success: false,
          reason: 'User is in quiet hours',
          notificationId: null
        };
      }

      // Get active FCM tokens
      const activeTokens = user.fcmTokens
        ?.filter(token => token.isActive)
        ?.map(token => token.token) || [];

      if (activeTokens.length === 0) {
        return {
          success: false,
          reason: 'No active FCM tokens found',
          notificationId: null
        };
      }

      // Create notification record in database
      notification = new Notification({
        userId: user._id, // Use MongoDB ObjectId for the notification record
        type,
        category: type,
        title,
        message,
        link,
        priority,
        actionButtons,
        metadata: data,
        deliveryStatus: DELIVERY_STATUS.PENDING
      });

      await notification.save();

      // Prepare FCM message
      const fcmMessage = this.buildFCMMessage({
        tokens: activeTokens,
        title,
        message,
        data,
        link,
        priority
      });

      // Send notification via FCM
      const response = await this.messaging.sendMulticast(fcmMessage);
      
      // Update notification with delivery results
      await this.updateDeliveryStatus(notification._id, response);

      // Handle failed tokens (remove inactive tokens)
      await this.handleFailedTokens(user.uid || user._id, response);

      return {
        success: true,
        notificationId: notification._id,
        deliveryStatus: this.getOverallDeliveryStatus(response),
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Update notification status to failed if it was created
      if (notification?._id) {
        await Notification.findByIdAndUpdate(notification._id, {
          deliveryStatus: DELIVERY_STATUS.FAILED,
          deliveryError: error.message,
          failedAt: new Date()
        });
      }

      return {
        success: false,
        reason: error.message,
        notificationId: notification?._id || null
      };
    }
  }

  /**
   * Find user by Firebase UID or MongoDB ObjectId
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} User object
   */
  async findUserById(userId) {
    // Check if userId is a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    let user;
    
    if (isObjectId) {
      // Try to find by MongoDB ObjectId first
      user = await User.findById(userId);
      if (user) {
        return user;
      }
    }
    
    // If not found by ObjectId or not a valid ObjectId, try by Firebase UID
    user = await User.findOne({ uid: userId });
    
    return user;
  }

  /**
   * Send notification using predefined template
   * @param {string} userId - Recipient user ID
   * @param {string} templateKey - Template key from notificationTemplates
   * @param {Object} templateData - Data to populate template
   * @param {Object} additionalOptions - Additional notification options
   * @returns {Promise<Object>} Result with notification ID and delivery status
   */
  async sendTemplateNotification(userId, templateKey, templateData = {}, additionalOptions = {}) {
    try {
      const template = notificationTemplates[templateKey];
      if (!template) {
        throw new Error(`Template not found: ${templateKey}`);
      }

      // Generate title and message from template
      const title = this.generateTemplateString(template.title, templateData);
      const message = this.generateTemplateString(template.message, templateData);

      // Send notification with template data
      return await this.sendNotification({
        userId,
        type: template.type,
        title,
        message,
        data: {
          ...templateData,
          templateKey,
          ...additionalOptions.data
        },
        link: template.link ? this.generateTemplateString(template.link, templateData) : null,
        priority: template.priority || PRIORITY_LEVELS.NORMAL,
        actionButtons: template.actionButtons || []
      });

    } catch (error) {
      console.error('Error sending template notification:', error);
      return {
        success: false,
        reason: error.message,
        notificationId: null
      };
    }
  }

  /**
   * Send bulk notifications to multiple users
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Object>} Bulk operation results
   */
  async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push({
          userId: notification.userId,
          ...result
        });
      } catch (error) {
        results.push({
          userId: notification.userId,
          success: false,
          reason: error.message,
          notificationId: null
        });
      }
    }

    return {
      total: notifications.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Build FCM message structure
   * @param {Object} params - Message parameters
   * @returns {Object} FCM message object
   */
  buildFCMMessage({ tokens, title, message, data, link, priority }) {
    return {
      tokens,
      notification: {
        title,
        body: message
      },
      data: {
        ...data,
        link: link || '',
        timestamp: Date.now().toString()
      },
      android: {
        priority: this.mapPriorityToAndroid(priority),
        notification: {
          icon: 'ic_notification',
          color: '#FF6B35',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
  }

  /**
   * Update notification delivery status based on FCM response
   * @param {string} notificationId - Notification ID
   * @param {Object} fcmResponse - FCM response object
   */
  async updateDeliveryStatus(notificationId, fcmResponse) {
    const { successCount, failureCount, responses } = fcmResponse;
    
    let deliveryStatus = DELIVERY_STATUS.DELIVERED;
    let deliveryError = null;

    if (failureCount > 0 && successCount === 0) {
      deliveryStatus = DELIVERY_STATUS.FAILED;
      // Get the first error message
      const failedResponse = responses.find(r => !r.success);
      deliveryError = failedResponse?.error?.message || 'Unknown FCM error';
    } else if (failureCount > 0 && successCount > 0) {
      deliveryStatus = DELIVERY_STATUS.PARTIAL;
    }

    await Notification.findByIdAndUpdate(notificationId, {
      deliveryStatus,
      deliveryError,
      deliveryAttempts: 1,
      lastDeliveryAttempt: new Date(),
      deliveredAt: successCount > 0 ? new Date() : null,
      failedAt: failureCount > 0 ? new Date() : null,
      fcmMessageId: fcmResponse.multicastId?.toString()
    });
  }

  /**
   * Handle failed FCM tokens by marking them as inactive
   * @param {string} userId - User ID (Firebase UID or MongoDB ObjectId)
   * @param {Object} fcmResponse - FCM response with failed tokens
   */
  async handleFailedTokens(userId, fcmResponse) {
    const { responses } = fcmResponse;
    const failedTokenIndexes = responses
      .map((response, index) => ({ response, index }))
      .filter(item => !item.response.success)
      .map(item => item.index);

    if (failedTokenIndexes.length > 0) {
      const user = await this.findUserById(userId);
      if (user && user.fcmTokens) {
        // Mark failed tokens as inactive
        failedTokenIndexes.forEach(index => {
          if (user.fcmTokens[index]) {
            user.fcmTokens[index].isActive = false;
          }
        });
        
        await user.save();
        console.log(`Marked ${failedTokenIndexes.length} FCM tokens as inactive for user ${userId}`);
      }
    }
  }

  /**
   * Check if current time is within user's quiet hours
   * @param {Object} quietHours - Quiet hours configuration
   * @returns {boolean} True if within quiet hours
   */
  isInQuietHours(quietHours) {
    if (!quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
    
    const startTime = this.parseTimeString(quietHours.startTime);
    const endTime = this.parseTimeString(quietHours.endTime);

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  parseTimeString(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Map priority level to Android priority
   * @param {string} priority - Priority level
   * @returns {string} Android priority
   */
  mapPriorityToAndroid(priority) {
    const priorityMap = {
      [PRIORITY_LEVELS.LOW]: 'normal',
      [PRIORITY_LEVELS.NORMAL]: 'normal',
      [PRIORITY_LEVELS.HIGH]: 'high',
      [PRIORITY_LEVELS.URGENT]: 'high'
    };
    return priorityMap[priority] || 'normal';
  }

  /**
   * Generate string from template with data substitution
   * @param {string} template - Template string with placeholders
   * @param {Object} data - Data for substitution
   * @returns {string} Generated string
   */
  generateTemplateString(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Get overall delivery status from FCM response
   * @param {Object} fcmResponse - FCM response object
   * @returns {string} Overall delivery status
   */
  getOverallDeliveryStatus(fcmResponse) {
    const { successCount, failureCount } = fcmResponse;
    
    if (successCount === 0) return DELIVERY_STATUS.FAILED;
    if (failureCount === 0) return DELIVERY_STATUS.DELIVERED;
    return DELIVERY_STATUS.PARTIAL;
  }

  /**
   * Retry failed notifications
   * @param {string} notificationId - Notification ID to retry
   * @returns {Promise<Object>} Retry result
   */
  async retryFailedNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.deliveryStatus !== DELIVERY_STATUS.FAILED) {
        throw new Error('Only failed notifications can be retried');
      }

      // Get fresh user data
      const user = await this.findUserById(notification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const activeTokens = user.fcmTokens
        ?.filter(token => token.isActive)
        ?.map(token => token.token) || [];

      if (activeTokens.length === 0) {
        throw new Error('No active FCM tokens found');
      }

      // Build and send FCM message
      const fcmMessage = this.buildFCMMessage({
        tokens: activeTokens,
        title: notification.title,
        message: notification.message,
        data: notification.metadata || {},
        link: notification.link,
        priority: notification.priority
      });

      const response = await this.messaging.sendMulticast(fcmMessage);
      
      // Update delivery status
      await this.updateDeliveryStatus(notificationId, response);
      
      return {
        success: true,
        deliveryStatus: this.getOverallDeliveryStatus(response),
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('Error retrying notification:', error);
      return {
        success: false,
        reason: error.message
      };
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
export { NotificationService };