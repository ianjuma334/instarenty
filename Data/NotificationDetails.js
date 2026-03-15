// Enhanced notification schema with FCM support and delivery tracking
import mongoose from "mongoose";

// Notification types and categories
const NOTIFICATION_TYPES = {
  BOOKING: 'booking',
  PAYMENT: 'payment',
  MESSAGE: 'message',
  SECURITY: 'security',
  SYSTEM: 'system',
  MARKETING: 'marketing',
  APPROVAL: 'approval',
  CUSTOM: 'custom'
};

const DELIVERY_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETRY: 'retry'
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

const notificationSchema = new mongoose.Schema({
  // Basic notification fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }, // recipient
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }, // optional
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: true
  },
  category: {
    type: String,
    enum: Object.keys(NOTIFICATION_TYPES),
    required: true
  },
  message: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  link: {
    type: String
  }, // optional: e.g., link to booking detail
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // FCM and delivery tracking
  fcmMessageId: {
    type: String,
    unique: true,
    sparse: true
  },
  deliveryStatus: {
    type: String,
    enum: Object.values(DELIVERY_STATUS),
    default: DELIVERY_STATUS.PENDING
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  lastDeliveryAttempt: {
    type: Date
  },
  deliveryError: {
    type: String
  },
  deliveredAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  
  // Priority and scheduling
  priority: {
    type: String,
    enum: Object.values(PRIORITY_LEVELS),
    default: PRIORITY_LEVELS.NORMAL
  },
  scheduledFor: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 7 days from creation
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  actionButtons: [{
    text: String,
    action: String,
    style: {
      type: String,
      enum: ['default', 'cancel', 'destructive']
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 }); // User notifications with pagination
notificationSchema.index({ type: 1, category: 1 }); // Type-based queries
notificationSchema.index({ deliveryStatus: 1 }); // Delivery status tracking
notificationSchema.index({ fcmMessageId: 1 }, { unique: true, sparse: true }); // FCM message lookups
notificationSchema.index({ scheduledFor: 1 }); // Scheduled notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire notifications
notificationSchema.index({ 'senderId': 1, 'userId': 1 }); // Sender-recipient lookups

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save middleware to update timestamps
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set readAt when isRead is changed from false to true
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  next();
});

// Static methods for common queries
notificationSchema.statics.findByUser = function(userId, options = {}) {
  const { limit = 50, skip = 0, unreadOnly = false } = options;
  let query = { userId, isDeleted: false };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

notificationSchema.statics.markAsRead = function(userId, notificationIds) {
  return this.updateMany(
    {
      userId: userId,
      _id: { $in: notificationIds },
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

// Export the model and constants
const Notification = mongoose.model("Notification", notificationSchema);

export { Notification, NOTIFICATION_TYPES, DELIVERY_STATUS, PRIORITY_LEVELS };
export default Notification;
