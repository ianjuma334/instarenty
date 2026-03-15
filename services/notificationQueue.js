import { Notification, DELIVERY_STATUS } from '../Data/NotificationDetails.js';
import notificationService from './notificationService.js';

/**
 * Phase 2.1: Notification Queue Service
 * Handles queued notifications, retry logic, and failed delivery management
 */
class NotificationQueue {
  constructor() {
    this.maxRetries = 3;
    this.retryDelays = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000]; // 5min, 15min, 1hr
    this.batchSize = 100; // Process notifications in batches
    this.isProcessing = false;
    this.retryQueue = new Map(); // In-memory retry queue
  }

  /**
   * Add notification to queue for processing
   * @param {Object} notificationData - Notification data
   * @returns {Promise<string>} Queue ID
   */
  async addToQueue(notificationData) {
    try {
      const queueId = this.generateQueueId();
      
      const queuedNotification = {
        id: queueId,
        ...notificationData,
        status: 'queued',
        attempts: 0,
        nextRetryAt: new Date(),
        createdAt: new Date(),
        errorLog: []
      };

      // Store in memory queue for immediate processing
      this.retryQueue.set(queueId, queuedNotification);
      
      // Also save to database for persistence
      await this.saveQueueItem(queuedNotification);

      console.log(`Notification added to queue: ${queueId}`);
      return queueId;

    } catch (error) {
      console.error('Error adding notification to queue:', error);
      throw error;
    }
  }

  /**
   * Process the notification queue
   * @returns {Promise<Object>} Processing results
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue processing already in progress');
      return { message: 'Queue processing already in progress' };
    }

    this.isProcessing = true;
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      retried: 0,
      errors: []
    };

    try {
      console.log('Starting queue processing...');

      // Get pending notifications from database
      const pendingNotifications = await this.getPendingNotifications();
      
      for (const notification of pendingNotifications) {
        try {
          results.processed++;
          
          // Check if it's time to retry
          if (notification.nextRetryAt && new Date() < notification.nextRetryAt) {
            continue; // Skip if not ready for retry
          }

          // Attempt to send notification
          const result = await notificationService.sendNotification(notification.notificationData);
          
          if (result.success) {
            await this.markAsProcessed(notification._id, 'delivered');
            results.successful++;
            console.log(`Notification ${notification._id} delivered successfully`);
          } else {
            await this.handleFailedNotification(notification, result.reason);
            results.failed++;
            results.errors.push({
              notificationId: notification._id,
              error: result.reason
            });
          }

        } catch (error) {
          console.error(`Error processing notification ${notification._id}:`, error);
          results.failed++;
          results.errors.push({
            notificationId: notification._id,
            error: error.message
          });
        }
      }

      // Process in-memory retry queue
      await this.processRetryQueue();

      console.log('Queue processing completed:', results);
      return results;

    } catch (error) {
      console.error('Error processing queue:', error);
      results.errors.push({ error: error.message });
      return results;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process the in-memory retry queue
   */
  async processRetryQueue() {
    const now = new Date();
    const readyForRetry = [];

    // Find notifications ready for retry
    for (const [queueId, queuedNotification] of this.retryQueue) {
      if (queuedNotification.nextRetryAt <= now && queuedNotification.attempts < this.maxRetries) {
        readyForRetry.push({ queueId, queuedNotification });
      }
    }

    // Process ready notifications
    for (const { queueId, queuedNotification } of readyForRetry) {
      try {
        queuedNotification.attempts++;
        const result = await notificationService.sendNotification(queuedNotification.notificationData);

        if (result.success) {
          await this.markQueueItemAsProcessed(queueId, 'delivered');
          this.retryQueue.delete(queueId);
          console.log(`Retry successful for queue item: ${queueId}`);
        } else {
          // Schedule next retry or mark as failed
          if (queuedNotification.attempts >= this.maxRetries) {
            await this.markQueueItemAsProcessed(queueId, 'failed', result.reason);
            this.retryQueue.delete(queueId);
            console.log(`Retry failed permanently for queue item: ${queueId}`);
          } else {
            // Schedule next retry
            const delayIndex = Math.min(queuedNotification.attempts - 1, this.retryDelays.length - 1);
            queuedNotification.nextRetryAt = new Date(Date.now() + this.retryDelays[delayIndex]);
            queuedNotification.errorLog.push({
              attempt: queuedNotification.attempts,
              error: result.reason,
              timestamp: new Date()
            });
          }
        }

      } catch (error) {
        console.error(`Error processing retry for queue item ${queueId}:`, error);
        
        if (queuedNotification.attempts >= this.maxRetries) {
          await this.markQueueItemAsProcessed(queueId, 'failed', error.message);
          this.retryQueue.delete(queueId);
        }
      }
    }
  }

  /**
   * Get pending notifications from database
   * @returns {Promise<Array>} Pending notifications
   */
  async getPendingNotifications() {
    return await Notification.find({
      deliveryStatus: { $in: [DELIVERY_STATUS.PENDING, DELIVERY_STATUS.RETRY] },
      $or: [
        { nextRetryAt: { $exists: false } },
        { nextRetryAt: { $lte: new Date() } }
      ]
    }).limit(this.batchSize).sort({ createdAt: 1 });
  }

  /**
   * Handle failed notification by scheduling retry
   * @param {Object} notification - Notification document
   * @param {string} reason - Failure reason
   */
  async handleFailedNotification(notification, reason) {
    notification.attempts = (notification.attempts || 0) + 1;
    notification.errorLog = notification.errorLog || [];
    
    notification.errorLog.push({
      attempt: notification.attempts,
      error: reason,
      timestamp: new Date()
    });

    if (notification.attempts >= this.maxRetries) {
      // Mark as permanently failed
      await Notification.findByIdAndUpdate(notification._id, {
        deliveryStatus: DELIVERY_STATUS.FAILED,
        failedAt: new Date(),
        deliveryError: reason,
        attempts: notification.attempts
      });
    } else {
      // Schedule retry
      const delayIndex = Math.min(notification.attempts - 1, this.retryDelays.length - 1);
      const nextRetryAt = new Date(Date.now() + this.retryDelays[delayIndex]);

      await Notification.findByIdAndUpdate(notification._id, {
        deliveryStatus: DELIVERY_STATUS.RETRY,
        nextRetryAt,
        attempts: notification.attempts,
        errorLog: notification.errorLog
      });
    }
  }

  /**
   * Schedule a notification for future delivery
   * @param {Object} notificationData - Notification data
   * @param {Date} scheduledFor - When to send the notification
   * @returns {Promise<string>} Scheduled notification ID
   */
  async scheduleNotification(notificationData, scheduledFor) {
    try {
      const notification = new Notification({
        ...notificationData,
        deliveryStatus: DELIVERY_STATUS.PENDING,
        scheduledFor
      });

      await notification.save();
      
      console.log(`Notification scheduled for ${scheduledFor}: ${notification._id}`);
      return notification._id;

    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} notificationId - Notification ID to cancel
   * @returns {Promise<boolean>} Success status
   */
  async cancelScheduledNotification(notificationId) {
    try {
      const result = await Notification.findByIdAndUpdate(
        notificationId,
        { 
          deliveryStatus: DELIVERY_STATUS.CANCELLED,
          cancelledAt: new Date()
        }
      );

      return !!result;
    } catch (error) {
      console.error('Error cancelling scheduled notification:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    try {
      const stats = await Promise.all([
        Notification.countDocuments({ deliveryStatus: DELIVERY_STATUS.PENDING }),
        Notification.countDocuments({ deliveryStatus: DELIVERY_STATUS.RETRY }),
        Notification.countDocuments({ deliveryStatus: DELIVERY_STATUS.FAILED }),
        Notification.countDocuments({ deliveryStatus: DELIVERY_STATUS.DELIVERED }),
        Notification.countDocuments({ 
          deliveryStatus: { $in: [DELIVERY_STATUS.PENDING, DELIVERY_STATUS.RETRY] },
          nextRetryAt: { $lte: new Date() }
        })
      ]);

      return {
        pending: stats[0],
        retrying: stats[1],
        failed: stats[2],
        delivered: stats[3],
        readyForRetry: stats[4],
        inMemoryQueue: this.retryQueue.size,
        isProcessing: this.isProcessing
      };

    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        pending: 0,
        retrying: 0,
        failed: 0,
        delivered: 0,
        readyForRetry: 0,
        inMemoryQueue: 0,
        isProcessing: this.isProcessing
      };
    }
  }

  /**
   * Clean up old notifications and failed entries
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanup() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Delete old delivered notifications
      const deliveredCleanup = await Notification.deleteMany({
        deliveryStatus: DELIVERY_STATUS.DELIVERED,
        createdAt: { $lt: thirtyDaysAgo }
      });

      // Delete old failed notifications (keep for 7 days for debugging)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const failedCleanup = await Notification.deleteMany({
        deliveryStatus: DELIVERY_STATUS.FAILED,
        createdAt: { $lt: sevenDaysAgo }
      });

      // Clear in-memory queue of old items
      const now = new Date();
      for (const [queueId, queuedNotification] of this.retryQueue) {
        if (queuedNotification.createdAt < sevenDaysAgo) {
          this.retryQueue.delete(queueId);
        }
      }

      return {
        deliveredDeleted: deliveredCleanup.deletedCount,
        failedDeleted: failedCleanup.deletedCount,
        inMemoryCleaned: 0 // This would need to be tracked separately
      };

    } catch (error) {
      console.error('Error during cleanup:', error);
      return {
        deliveredDeleted: 0,
        failedDeleted: 0,
        inMemoryCleaned: 0
      };
    }
  }

  /**
   * Generate unique queue ID
   * @returns {string} Unique queue ID
   */
  generateQueueId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save queue item to database for persistence
   * @param {Object} queueItem - Queue item to save
   */
  async saveQueueItem(queueItem) {
    // This could be implemented with a separate Queue collection
    // For now, we'll just log it
    console.log('Queue item saved:', queueItem.id);
  }

  /**
   * Mark queue item as processed
   * @param {string} queueId - Queue ID
   * @param {string} status - Final status
   * @param {string} error - Error message if failed
   */
  async markQueueItemAsProcessed(queueId, status, error = null) {
    console.log(`Queue item ${queueId} marked as ${status}${error ? `: ${error}` : ''}`);
  }

  /**
   * Mark database notification as processed
   * @param {string} notificationId - Notification ID
   * @param {string} status - Final status
   */
  async markAsProcessed(notificationId, status) {
    await Notification.findByIdAndUpdate(notificationId, {
      deliveryStatus: status,
      processedAt: new Date()
    });
  }
}

// Export singleton instance
const notificationQueue = new NotificationQueue();
export default notificationQueue;
export { NotificationQueue };