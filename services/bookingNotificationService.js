import notificationService from './notificationService.js';
import Post from '../Data/PostDetails.js';
import User from '../Data/UserDetails.js';

/**
 * Phase 3.1: Booking Notification Service
 * Specialized service for handling property booking notifications
 * This service integrates with the existing NotificationService to send
 * proper FCM push notifications to landlords when properties are booked
 */
class BookingNotificationService {
  /**
   * Send booking notification to landlord
   * @param {Object} bookingData - Booking information
   * @param {string} bookingData.postId - Property post ID
   * @param {string} bookingData.tenantId - Tenant user ID
   * @param {number} bookingData.numberBooked - Number of rooms booked
   * @returns {Promise<Object>} Notification result
   */
  async sendBookingNotificationToLandlord(bookingData) {
    const { postId, tenantId, numberBooked } = bookingData;

    try {
      // Fetch property details
      const property = await Post.findById(postId);
      if (!property) {
        throw new Error(`Property not found: ${postId}`);
      }

      // Fetch tenant details
      const tenant = await User.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const landlordId = property.userId;
      const propertyTitle = property.title || `${property.type} in ${property.location?.area || 'Unknown Area'}`;

      // Prepare template data
      const templateData = {
        propertyTitle,
        propertyId: postId.toString(),
        tenantName: `${tenant.fname} ${tenant.lname}`.trim() || tenant.username || 'A tenant',
        tenantUsername: tenant.username || '',
        numberBooked: numberBooked.toString(),
        bookingDate: new Date().toLocaleDateString(),
        amount: numberBooked > 1 ? `${numberBooked} rooms` : '1 room'
      };

      // Use the existing bookingRequest template
      const result = await notificationService.sendTemplateNotification(
        landlordId.toString(),
        'bookingRequest',
        templateData,
        {
          data: {
            bookingId: bookingData.bookingId || '',
            postId: postId.toString(),
            tenantId: tenantId.toString(),
            landlordId: landlordId.toString(),
            numberBooked: numberBooked.toString(),
            notificationType: 'booking_received'
          }
        }
      );

      if (result.success) {
        console.log(`Booking notification sent successfully to landlord ${landlordId}:`, {
          notificationId: result.notificationId,
          tenant: templateData.tenantName,
          property: propertyTitle,
          rooms: numberBooked
        });
      } else {
        console.warn(`Booking notification failed for landlord ${landlordId}:`, {
          reason: result.reason,
          tenant: templateData.tenantName,
          property: propertyTitle
        });
      }

      return {
        success: result.success,
        notificationId: result.notificationId,
        landlordId: landlordId.toString(),
        tenantId: tenantId.toString(),
        propertyId: postId.toString(),
        reason: result.reason,
        deliveryStatus: result.deliveryStatus || 'unknown'
      };

    } catch (error) {
      console.error('Error sending booking notification:', error);
      return {
        success: false,
        error: error.message,
        landlordId: property?.userId?.toString(),
        tenantId: tenantId.toString(),
        propertyId: postId.toString()
      };
    }
  }

  /**
   * Send booking confirmation notification to tenant
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Notification result
   */
  async sendBookingConfirmationToTenant(bookingData) {
    const { postId, tenantId, numberBooked, bookingId } = bookingData;

    try {
      // Fetch property details
      const property = await Post.findById(postId);
      if (!property) {
        throw new Error(`Property not found: ${postId}`);
      }

      // Fetch landlord details
      const landlord = await User.findById(property.userId);
      if (!landlord) {
        throw new Error(`Landlord not found: ${property.userId}`);
      }

      const propertyTitle = property.title || `${property.type} in ${property.location?.area || 'Unknown Area'}`;

      // Prepare template data
      const templateData = {
        propertyTitle,
        propertyId: postId.toString(),
        landlordName: `${landlord.fname} ${landlord.lname}`.trim() || landlord.username || 'Landlord',
        landlordPhone: landlord.phone || '',
        numberBooked: numberBooked.toString(),
        bookingDate: new Date().toLocaleDateString(),
        amount: numberBooked > 1 ? `${numberBooked} rooms` : '1 room'
      };

      // Use the existing bookingConfirmed template
      const result = await notificationService.sendTemplateNotification(
        tenantId.toString(),
        'bookingConfirmed',
        templateData,
        {
          data: {
            bookingId: bookingId || '',
            postId: postId.toString(),
            landlordId: property.userId.toString(),
            tenantId: tenantId.toString(),
            numberBooked: numberBooked.toString(),
            notificationType: 'booking_confirmed'
          }
        }
      );

      if (result.success) {
        console.log(`Booking confirmation sent successfully to tenant ${tenantId}:`, {
          notificationId: result.notificationId,
          property: propertyTitle,
          rooms: numberBooked
        });
      } else {
        console.warn(`Booking confirmation failed for tenant ${tenantId}:`, {
          reason: result.reason,
          property: propertyTitle
        });
      }

      return {
        success: result.success,
        notificationId: result.notificationId,
        tenantId: tenantId.toString(),
        propertyId: postId.toString(),
        reason: result.reason,
        deliveryStatus: result.deliveryStatus || 'unknown'
      };

    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      return {
        success: false,
        error: error.message,
        tenantId: tenantId.toString(),
        propertyId: postId.toString()
      };
    }
  }

  /**
   * Send bulk booking notifications (for multiple properties)
   * @param {Array} bookingsData - Array of booking data
   * @returns {Promise<Object>} Bulk notification results
   */
  async sendBulkBookingNotifications(bookingsData) {
    const results = [];

    for (const bookingData of bookingsData) {
      try {
        const landlordResult = await this.sendBookingNotificationToLandlord(bookingData);
        const tenantResult = await this.sendBookingConfirmationToTenant(bookingData);

        results.push({
          bookingId: bookingData.bookingId,
          landlordNotification: landlordResult,
          tenantNotification: tenantResult,
          overallSuccess: landlordResult.success && tenantResult.success
        });
      } catch (error) {
        console.error(`Error in bulk booking notification for booking ${bookingData.bookingId}:`, error);
        results.push({
          bookingId: bookingData.bookingId,
          landlordNotification: { success: false, error: error.message },
          tenantNotification: { success: false, error: error.message },
          overallSuccess: false
        });
      }
    }

    const successful = results.filter(r => r.overallSuccess).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get booking notification statistics
   * @param {string} landlordId - Landlord user ID
   * @param {string} tenantId - Tenant user ID (optional)
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} Notification statistics
   */
  async getBookingNotificationStats(landlordId, tenantId = null, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const matchStage = {
        'metadata.notificationType': { $in: ['booking_received', 'booking_confirmed'] }
      };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      const Notification = require('../Data/NotificationDetails.js').default;
      
      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$metadata.notificationType',
            total: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0]
              }
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0]
              }
            }
          }
        }
      ];

      const stats = await Notification.aggregate(pipeline);

      return {
        totalNotifications: stats.reduce((sum, stat) => sum + stat.total, 0),
        successfulDeliveries: stats.reduce((sum, stat) => sum + stat.successful, 0),
        failedDeliveries: stats.reduce((sum, stat) => sum + stat.failed, 0),
        successRate: 0,
        breakdown: stats
      };

    } catch (error) {
      console.error('Error getting booking notification stats:', error);
      return {
        totalNotifications: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        successRate: 0,
        breakdown: [],
        error: error.message
      };
    }
  }
}

// Export singleton instance
const bookingNotificationService = new BookingNotificationService();
export default bookingNotificationService;
export { BookingNotificationService };