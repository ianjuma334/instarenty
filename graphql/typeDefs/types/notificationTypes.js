import gql from "graphql-tag";

export default gql`
  # Notification Types
  type Notification {
    id: ID!
    userId: ID!
    senderId: ID
    type: String!
    category: String!
    title: String!
    message: String!
    description: String
    link: String
    isRead: Boolean!
    readAt: String
    isDeleted: Boolean!
    isExpired: Boolean
    priority: String!
    scheduledFor: String
    expiresAt: String
    deliveredAt: String
    failedAt: String
    fcmMessageId: String
    deliveryStatus: String!
    deliveryAttempts: Int!
    lastDeliveryAttempt: String
    deliveryError: String
    metadata: JSON
    actionButtons: [ActionButton!]!
    createdAt: String!
    updatedAt: String!
  }

  # Action button for notifications
  type ActionButton {
    text: String!
    action: String!
    style: String
  }

  # Notification input types
  input SendNotificationInput {
    userId: ID!
    type: String!
    title: String!
    message: String!
    description: String
    link: String
    priority: String
    metadata: JSON
    actionButtons: [ActionButtonInput!]
  }

  input ActionButtonInput {
    text: String!
    action: String!
    style: String
  }

  input SendTemplateNotificationInput {
    userId: ID!
    templateKey: String!
    templateData: JSON!
    additionalOptions: JSON
  }

  input UpdateNotificationPreferencesInput {
    enabled: Boolean
    categories: NotificationCategoryPreferencesInput
    quietHours: QuietHoursInput
    sound: Boolean
    vibration: Boolean
  }

  input NotificationCategoryPreferencesInput {
    booking: Boolean
    payment: Boolean
    message: Boolean
    security: Boolean
    marketing: Boolean
    system: Boolean
  }

  input QuietHoursInput {
    enabled: Boolean
    startTime: String
    endTime: String
  }

  input GetUserNotificationsInput {
    limit: Int
    skip: Int
    unreadOnly: Boolean
    type: String
    category: String
    dateFrom: String
    dateTo: String
  }

  # Notification connection for pagination
  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type NotificationEdge {
    node: Notification!
    cursor: String!
  }

  # Notification response types
  type SendNotificationResponse {
    success: Boolean!
    message: String!
    notificationId: ID
    deliveryStatus: String
    successCount: Int
    failureCount: Int
  }

  type SendBulkNotificationsResponse {
    total: Int!
    successful: Int!
    failed: Int!
    results: [NotificationResult!]!
  }

  type NotificationResult {
    userId: ID!
    success: Boolean!
    message: String
    notificationId: ID
    deliveryStatus: String
    successCount: Int
    failureCount: Int
  }

  type MarkNotificationsReadResponse {
    success: Boolean!
    message: String!
    markedCount: Int!
  }

  type RetryNotificationResponse {
    success: Boolean!
    message: String!
    deliveryStatus: String
    successCount: Int
    failureCount: Int
  }

  type ScheduleNotificationResponse {
    success: Boolean!
    message: String!
    notificationId: ID
    scheduledFor: String!
  }

  type CancelScheduledNotificationResponse {
    success: Boolean!
    message: String!
  }

  # Queue statistics
  type NotificationQueueStats {
    pending: Int!
    retrying: Int!
    failed: Int!
    delivered: Int!
    readyForRetry: Int!
    inMemoryQueue: Int!
    isProcessing: Boolean!
  }

  type ProcessQueueResponse {
    success: Boolean!
    message: String!
    processed: Int!
    successful: Int!
    failed: Int!
    retried: Int!
    errors: [QueueError!]!
  }

  type QueueError {
    notificationId: ID
    error: String!
  }

  type CleanupResponse {
    success: Boolean!
    message: String!
    deliveredDeleted: Int!
    failedDeleted: Int!
    inMemoryCleaned: Int!
  }

  # Template-related types
  type NotificationTemplate {
    key: String!
    type: String!
    priority: String!
    title: String!
    message: String!
    link: String
    actionButtons: [ActionButtonTemplate!]!
  }

  type ActionButtonTemplate {
    text: String!
    action: String!
    style: String
  }

  type TemplateValidationResult {
    valid: Boolean!
    errors: [String!]!
    missingPlaceholders: [String!]!
  }

  # Subscriptions
  type NotificationSubscription {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    message: String!
    link: String
    priority: String!
    createdAt: String!
  }

  # JSON scalar type
  scalar JSON

  # Queries
  type Query {
    # Get user notifications with pagination
    getUserNotifications(input: GetUserNotificationsInput): NotificationConnection!
    
    # Get single notification
    getNotification(id: ID!): Notification
    
    # Get unread notification count
    getUnreadNotificationCount(userId: ID!): Int!
    
    # Get notification queue statistics
    getNotificationQueueStats: NotificationQueueStats!
    
    # Get available notification templates
    getNotificationTemplates: [NotificationTemplate!]!
    
    # Validate template data
    validateNotificationTemplate(templateKey: String!, data: JSON!): TemplateValidationResult!
    
    # Get user notification preferences
    getUserNotificationPreferences(userId: ID!): NotificationPreferences!
  }

  # Mutations
  type Mutation {
    # Send a notification
    sendNotification(input: SendNotificationInput!): SendNotificationResponse!
    
    # Send notification using template
    sendTemplateNotification(input: SendTemplateNotificationInput!): SendNotificationResponse!
    
    # Send bulk notifications
    sendBulkNotifications(notifications: [SendNotificationInput!]!): SendBulkNotificationsResponse!
    
    # Mark notifications as read
    markNotificationsAsRead(userId: ID!, notificationIds: [ID!]!): MarkNotificationsReadResponse!
    
    # Mark all notifications as read
    markAllNotificationsAsRead(userId: ID!): MarkNotificationsReadResponse!
    
    # Delete notifications
    deleteNotifications(userId: ID!, notificationIds: [ID!]!): MarkNotificationsReadResponse!
    
    # Retry failed notification
    retryFailedNotification(notificationId: ID!): RetryNotificationResponse!
    
    # Schedule notification for future delivery
    scheduleNotification(input: SendNotificationInput!, scheduledFor: String!): ScheduleNotificationResponse!
    
    # Cancel scheduled notification
    cancelScheduledNotification(notificationId: ID!): CancelScheduledNotificationResponse!
    
    # Update user notification preferences
    updateNotificationPreferences(userId: ID!, preferences: UpdateNotificationPreferencesInput!): Boolean!
    
    # Register FCM token for user
    registerFCMToken(userId: ID!, token: String!, deviceType: String!, deviceName: String): Boolean!
    
    # Unregister FCM token
    unregisterFCMToken(userId: ID!, token: String!): Boolean!
    
    # Process notification queue
    processNotificationQueue: ProcessQueueResponse!
    
    # Clean up old notifications
    cleanupOldNotifications: CleanupResponse!
    
    # Create custom notification template
    createNotificationTemplate(key: String!, template: NotificationTemplateInput!): Boolean!
    
    # Update notification template
    updateNotificationTemplate(key: String!, updates: NotificationTemplateInput!): Boolean!
    
    # Delete custom notification template
    deleteNotificationTemplate(key: String!): Boolean!
  }

  input NotificationTemplateInput {
    type: String!
    priority: String!
    title: String!
    message: String!
    link: String
    actionButtons: [ActionButtonInput!]
  }

  # Subscriptions
  type Subscription {
    # Real-time notification subscription
    notificationReceived(userId: ID!): NotificationSubscription!
    
    # Notification status updates
    notificationStatusUpdate(userId: ID!, notificationId: ID!): Notification!
  }

  # User notification preferences type
  type NotificationPreferences {
    enabled: Boolean!
    categories: NotificationCategoryPreferences!
    quietHours: QuietHours!
    sound: Boolean!
    vibration: Boolean!
  }

  type NotificationCategoryPreferences {
    booking: Boolean!
    payment: Boolean!
    message: Boolean!
    security: Boolean!
    marketing: Boolean!
    system: Boolean!
  }

  type QuietHours {
    enabled: Boolean!
    startTime: String!
    endTime: String!
  }
`;