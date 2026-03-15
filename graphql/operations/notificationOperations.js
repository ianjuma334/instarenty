import { gql } from 'graphql-tag';

/**
 * Phase 2.3: GraphQL Operations for Notification System
 * 
 * These operations bridge the client-side Redux expectations with the existing
 * GraphQL schema and resolvers. The client-side components in Phase 2.2 are
 * already designed to work with these operations.
 */

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Fetch user notifications with pagination and filtering
 * Used by: NotificationScreen, Redux fetchNotifications thunk
 */
export const GET_USER_NOTIFICATIONS = gql`
  query GetUserNotifications($input: GetUserNotificationsInput) {
    getUserNotifications(input: $input) {
      edges {
        node {
          id
          userId
          senderId
          type
          category
          title
          message
          description
          link
          isRead
          readAt
          isDeleted
          isExpired
          priority
          scheduledFor
          expiresAt
          deliveredAt
          failedAt
          fcmMessageId
          deliveryStatus
          deliveryAttempts
          lastDeliveryAttempt
          deliveryError
          metadata
          actionButtons {
            text
            action
            style
          }
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`;

/**
 * Get unread notification count
 * Used by: NotificationBadge component, Redux selectUnreadCount selector
 */
export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount($userId: ID!) {
    getUnreadNotificationCount(userId: $userId)
  }
`;

/**
 * Get single notification by ID
 * Used by: Individual notification operations
 */
export const GET_NOTIFICATION = gql`
  query GetNotification($id: ID!) {
    getNotification(id: $id) {
      id
      userId
      senderId
      type
      category
      title
      message
      description
      link
      isRead
      readAt
      isDeleted
      isExpired
      priority
      scheduledFor
      expiresAt
      deliveredAt
      failedAt
      fcmMessageId
      deliveryStatus
      deliveryAttempts
      lastDeliveryAttempt
      deliveryError
      metadata
      actionButtons {
        text
        action
        style
      }
      createdAt
      updatedAt
    }
  }
`;

/**
 * Get user notification preferences
 * Used by: NotificationSettingsScreen, Redux slice preferences
 */
export const GET_USER_NOTIFICATION_PREFERENCES = gql`
  query GetUserNotificationPreferences($userId: ID!) {
    getUserNotificationPreferences(userId: $userId) {
      enabled
      categories {
        booking
        payment
        message
        security
        marketing
        system
      }
      quietHours {
        enabled
        startTime
        endTime
      }
      sound
      vibration
    }
  }
`;

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Mark notifications as read
 * Used by: NotificationCard, Redux markNotificationAsRead thunk
 */
export const MARK_NOTIFICATIONS_AS_READ = gql`
  mutation MarkNotificationsAsRead($userId: ID!, $notificationIds: [ID!]!) {
    markNotificationsAsRead(userId: $userId, notificationIds: $notificationIds) {
      success
      message
      markedCount
    }
  }
`;

/**
 * Mark all notifications as read
 * Used by: NotificationScreen, Redux markAllNotificationsAsRead thunk
 */
export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead($userId: ID!) {
    markAllNotificationsAsRead(userId: $userId) {
      success
      message
      markedCount
    }
  }
`;

/**
 * Delete notifications
 * Used by: NotificationCard delete action
 */
export const DELETE_NOTIFICATIONS = gql`
  mutation DeleteNotifications($userId: ID!, $notificationIds: [ID!]!) {
    deleteNotifications(userId: $userId, notificationIds: $notificationIds) {
      success
      message
      markedCount
    }
  }
`;

/**
 * Update user notification preferences
 * Used by: NotificationSettingsScreen, Redux updateNotificationPreferences thunk
 */
export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($userId: ID!, $preferences: UpdateNotificationPreferencesInput!) {
    updateNotificationPreferences(userId: $userId, preferences: $preferences)
  }
`;

/**
 * Register FCM token
 * Used by: Redux registerFCMToken thunk, notification service initialization
 */
export const REGISTER_FCM_TOKEN = gql`
  mutation RegisterFCMToken($userId: ID!, $token: String!, $deviceType: String!, $deviceName: String) {
    registerFCMToken(userId: $userId, token: $token, deviceType: $deviceType, deviceName: $deviceName)
  }
`;

/**
 * Send a notification (for testing/admin purposes)
 * Used by: NotificationTestScreen
 */
export const SEND_NOTIFICATION = gql`
  mutation SendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input) {
      success
      message
      notificationId
      deliveryStatus
      successCount
      failureCount
    }
  }
`;

/**
 * Send template notification
 * Used by: Automated notification system
 */
export const SEND_TEMPLATE_NOTIFICATION = gql`
  mutation SendTemplateNotification($input: SendTemplateNotificationInput!) {
    sendTemplateNotification(input: $input) {
      success
      message
      notificationId
      deliveryStatus
      successCount
      failureCount
    }
  }
`;

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

/**
 * Real-time notification subscription
 * Used by: useNotificationsEnhanced hook for real-time updates
 */
export const NOTIFICATION_RECEIVED = gql`
  subscription NotificationReceived($userId: ID!) {
    notificationReceived(userId: $userId) {
      id
      userId
      type
      title
      message
      link
      priority
      createdAt
    }
  }
`;

/**
 * Notification status updates
 * Used by: Real-time notification status tracking
 */
export const NOTIFICATION_STATUS_UPDATE = gql`
  subscription NotificationStatusUpdate($userId: ID!, $notificationId: ID!) {
    notificationStatusUpdate(userId: $userId, notificationId: $notificationId) {
      id
      userId
      type
      category
      title
      message
      isRead
      readAt
      deliveryStatus
      deliveryError
      updatedAt
    }
  }
`;

// =============================================================================
// CLIENT-SIDE USAGE EXAMPLES
// =============================================================================

/**
 * Example: How to use in client-side Redux thunks
 * 
 * // In notificationSlice.js async thunks
 * 
 * export const fetchNotifications = createAsyncThunk(
 *   'notifications/fetchNotifications',
 *   async ({ userId, limit = 20, offset = 0, unreadOnly = false }) => {
 *     const response = await client.query({
 *       query: GET_USER_NOTIFICATIONS,
 *       variables: {
 *         input: { userId, limit, skip: offset, unreadOnly }
 *       }
 *     });
 *     
 *     return response.data.getUserNotifications;
 *   }
 * );
 * 
 * export const markNotificationAsRead = createAsyncThunk(
 *   'notifications/markAsRead',
 *   async ({ notificationId, userId }) => {
 *     const response = await client.mutate({
 *       mutation: MARK_NOTIFICATIONS_AS_READ,
 *       variables: { userId, notificationIds: [notificationId] }
 *     });
 *     
 *     return response.data.markNotificationsAsRead;
 *   }
 * );
 */

/**
 * Example: How to use in React components
 * 
 * // In NotificationBadge.js
 * const NotificationBadge = () => {
 *   const { data } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
 *     variables: { userId: currentUser.id }
 *   });
 * 
 *   return (
 *     <View>
 *       <Text>Notifications</Text>
 *       {data?.getUnreadNotificationCount > 0 && (
 *         <Badge>{data.getUnreadNotificationCount}</Badge>
 *       )}
 *     </View>
 *   );
 * };
 */

/**
 * Example: Real-time subscriptions
 * 
 * // In useNotificationsEnhanced.js
 * const useNotificationsEnhanced = (userId) => {
 *   const { data } = useSubscription(NOTIFICATION_RECEIVED, {
 *     variables: { userId }
 *   });
 * 
 *   useEffect(() => {
 *     if (data?.notificationReceived) {
 *       dispatch(addNotification(data.notificationReceived));
 *     }
 *   }, [data, dispatch]);
 * };
 */