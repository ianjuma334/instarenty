import { NOTIFICATION_TYPES, PRIORITY_LEVELS } from '../Data/NotificationDetails.js';

/**
 * Phase 2.1: Notification Templates
 * Pre-defined notification templates for consistent messaging across the app
 */

const notificationTemplates = {
  // Booking-related notifications
  bookingRequest: {
    type: NOTIFICATION_TYPES.BOOKING,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'New Booking Request',
    message: 'You have a new booking request for {{propertyTitle}}',
    link: '/bookings/{{bookingId}}',
    actionButtons: [
      { text: 'View Details', action: 'view_booking', style: 'default' },
      { text: 'Accept', action: 'accept_booking', style: 'default' },
      { text: 'Decline', action: 'decline_booking', style: 'destructive' }
    ]
  },

  bookingConfirmed: {
    type: NOTIFICATION_TYPES.BOOKING,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Booking Confirmed',
    message: 'Your booking for {{propertyTitle}} has been confirmed',
    link: '/bookings/{{bookingId}}',
    actionButtons: [
      { text: 'View Booking', action: 'view_booking', style: 'default' },
      { text: 'Contact Landlord', action: 'contact_landlord', style: 'default' }
    ]
  },

  bookingCancelled: {
    type: NOTIFICATION_TYPES.BOOKING,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Booking Cancelled',
    message: 'Your booking for {{propertyTitle}} has been cancelled',
    link: '/bookings/{{bookingId}}',
    actionButtons: [
      { text: 'View Details', action: 'view_booking', style: 'default' },
      { text: 'Find Similar', action: 'search_similar', style: 'default' }
    ]
  },

  bookingReminder: {
    type: NOTIFICATION_TYPES.BOOKING,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Booking Reminder',
    message: 'Your viewing for {{propertyTitle}} is scheduled for {{appointmentDate}}',
    link: '/bookings/{{bookingId}}',
    actionButtons: [
      { text: 'View Details', action: 'view_booking', style: 'default' },
      { text: 'Reschedule', action: 'reschedule_booking', style: 'default' }
    ]
  },

  // Payment-related notifications
  paymentReceived: {
    type: NOTIFICATION_TYPES.PAYMENT,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Payment Received',
    message: 'Payment of KES {{amount}} received for {{propertyTitle}}',
    link: '/transactions/{{transactionId}}',
    actionButtons: [
      { text: 'View Transaction', action: 'view_transaction', style: 'default' },
      { text: 'Download Receipt', action: 'download_receipt', style: 'default' }
    ]
  },

  paymentFailed: {
    type: NOTIFICATION_TYPES.PAYMENT,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Payment Failed',
    message: 'Payment of KES {{amount}} failed for {{propertyTitle}}',
    link: '/transactions/{{transactionId}}',
    actionButtons: [
      { text: 'Try Again', action: 'retry_payment', style: 'default' },
      { text: 'View Details', action: 'view_transaction', style: 'default' }
    ]
  },

  lowBalance: {
    type: NOTIFICATION_TYPES.PAYMENT,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Low Balance Alert',
    message: 'Your account balance is running low (KES {{balance}})',
    link: '/wallet',
    actionButtons: [
      { text: 'Add Funds', action: 'add_funds', style: 'default' },
      { text: 'View Wallet', action: 'view_wallet', style: 'default' }
    ]
  },

  depositRequired: {
    type: NOTIFICATION_TYPES.PAYMENT,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Deposit Required',
    message: 'A deposit of KES {{amount}} is required for {{propertyTitle}}',
    link: '/payments/deposit/{{propertyId}}',
    actionButtons: [
      { text: 'Pay Deposit', action: 'pay_deposit', style: 'default' },
      { text: 'View Details', action: 'view_property', style: 'default' }
    ]
  },

  salaryPayment: {
    type: NOTIFICATION_TYPES.PAYMENT,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Salary Payment',
    message: 'Your salary of KES {{amount}} has been processed',
    link: '/transactions/{{transactionId}}',
    actionButtons: [
      { text: 'View Transaction', action: 'view_transaction', style: 'default' },
      { text: 'View History', action: 'view_salary_history', style: 'default' }
    ]
  },

  // Security-related notifications
  loginAlert: {
    type: NOTIFICATION_TYPES.SECURITY,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'New Login Detected',
    message: 'New login from {{deviceInfo}} at {{location}}',
    link: '/security/login-history',
    actionButtons: [
      { text: 'Review Activity', action: 'review_activity', style: 'default' },
      { text: 'Secure Account', action: 'secure_account', style: 'default' }
    ]
  },

  accountLocked: {
    type: NOTIFICATION_TYPES.SECURITY,
    priority: PRIORITY_LEVELS.URGENT,
    title: 'Account Security Alert',
    message: 'Your account has been temporarily locked due to suspicious activity',
    link: '/security/unlock',
    actionButtons: [
      { text: 'Unlock Account', action: 'unlock_account', style: 'default' },
      { text: 'Contact Support', action: 'contact_support', style: 'default' }
    ]
  },

  passwordChanged: {
    type: NOTIFICATION_TYPES.SECURITY,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Password Changed',
    message: 'Your password was successfully changed',
    link: '/security/settings',
    actionButtons: [
      { text: 'Security Settings', action: 'security_settings', style: 'default' }
    ]
  },

  // Message-related notifications
  newMessage: {
    type: NOTIFICATION_TYPES.MESSAGE,
    priority: NOTIFICATION_TYPES.NORMAL,
    title: 'New Message',
    message: 'New message from {{senderName}}: {{messagePreview}}',
    link: '/messages/{{conversationId}}',
    actionButtons: [
      { text: 'Reply', action: 'reply_message', style: 'default' },
      { text: 'View All', action: 'view_messages', style: 'default' }
    ]
  },

  // System notifications
  systemMaintenance: {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Scheduled Maintenance',
    message: 'System maintenance scheduled for {{maintenanceDate}}',
    link: '/maintenance-info',
    actionButtons: [
      { text: 'View Details', action: 'view_maintenance', style: 'default' }
    ]
  },

  appUpdate: {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'App Update Available',
    message: 'A new version of InstaRenty is available',
    link: '/app-update',
    actionButtons: [
      { text: 'Update Now', action: 'update_app', style: 'default' },
      { text: 'Later', action: 'update_later', style: 'cancel' }
    ]
  },

  approvalRequired: {
    type: NOTIFICATION_TYPES.APPROVAL,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Approval Required',
    message: 'Your {{itemType}} requires approval: {{itemTitle}}',
    link: '/approvals/{{approvalId}}',
    actionButtons: [
      { text: 'Review', action: 'review_approval', style: 'default' },
      { text: 'Approve', action: 'approve_item', style: 'default' },
      { text: 'Reject', action: 'reject_item', style: 'destructive' }
    ]
  },

  approvalGranted: {
    type: NOTIFICATION_TYPES.APPROVAL,
    priority: PRIORITY_LEVELS.HIGH,
    title: 'Approval Granted',
    message: 'Your {{itemType}} "{{itemTitle}}" has been approved',
    link: '/{{itemType}}s/{{itemId}}',
    actionButtons: [
      { text: 'View Item', action: 'view_item', style: 'default' }
    ]
  },

  approvalRejected: {
    type: NOTIFICATION_TYPES.APPROVAL,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Approval Rejected',
    message: 'Your {{itemType}} "{{itemTitle}}" requires changes',
    link: '/{{itemType}}s/{{itemId}}/edit',
    actionButtons: [
      { text: 'View Feedback', action: 'view_feedback', style: 'default' },
      { text: 'Make Changes', action: 'edit_item', style: 'default' }
    ]
  },

  // Marketing notifications
  newPropertyMatch: {
    type: NOTIFICATION_TYPES.MARKETING,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'New Property Match',
    message: 'We found a property that matches your criteria: {{propertyTitle}}',
    link: '/properties/{{propertyId}}',
    actionButtons: [
      { text: 'View Property', action: 'view_property', style: 'default' },
      { text: 'View All Matches', action: 'view_all_matches', style: 'default' }
    ]
  },

  priceDrop: {
    type: NOTIFICATION_TYPES.MARKETING,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Price Drop Alert',
    message: 'Price dropped for {{propertyTitle}} - now KES {{newPrice}}',
    link: '/properties/{{propertyId}}',
    actionButtons: [
      { text: 'View Property', action: 'view_property', style: 'default' }
    ]
  },

  // Generic/fallback templates
  info: {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Information',
    message: '{{message}}',
    link: '{{link}}',
    actionButtons: []
  },

  success: {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Success',
    message: '{{message}}',
    link: '{{link}}',
    actionButtons: []
  },

  warning: {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Warning',
    message: '{{message}}',
    link: '{{link}}',
    actionButtons: []
  },

  error: {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: PRIORITY_LEVELS.NORMAL,
    title: 'Error',
    message: '{{message}}',
    link: '{{link}}',
    actionButtons: []
  }
};

/**
 * Get a notification template by key
 * @param {string} templateKey - Template key
 * @returns {Object|null} Template object or null if not found
 */
export const getTemplate = (templateKey) => {
  return notificationTemplates[templateKey] || null;
};

/**
 * Check if a template exists
 * @param {string} templateKey - Template key
 * @returns {boolean} True if template exists
 */
export const hasTemplate = (templateKey) => {
  return templateKey in notificationTemplates;
};

/**
 * Get all available template keys
 * @returns {Array<string>} Array of template keys
 */
export const getAllTemplateKeys = () => {
  return Object.keys(notificationTemplates);
};

/**
 * Get templates by category
 * @param {string} category - Notification type/category
 * @returns {Array<Object>} Array of templates for the category
 */
export const getTemplatesByCategory = (category) => {
  return Object.values(notificationTemplates).filter(template => template.type === category);
};

/**
 * Validate template data against template requirements
 * @param {string} templateKey - Template key
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
export const validateTemplateData = (templateKey, data) => {
  const template = getTemplate(templateKey);
  if (!template) {
    return {
      valid: false,
      errors: [`Template not found: ${templateKey}`]
    };
  }

  const errors = [];
  
  // Extract placeholders from template strings
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders = new Set();
  
  let match;
  while ((match = placeholderRegex.exec(template.title + template.message + (template.link || ''))) !== null) {
    placeholders.add(match[1]);
  }

  // Check if all required placeholders have data
  for (const placeholder of placeholders) {
    if (!(placeholder in data)) {
      errors.push(`Missing required data for placeholder: ${placeholder}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingPlaceholders: [...placeholders].filter(p => !(p in data))
  };
};

/**
 * Create a custom template
 * @param {string} key - Template key
 * @param {Object} template - Template object
 * @returns {boolean} Success status
 */
export const createCustomTemplate = (key, template) => {
  try {
    // Validate template structure
    if (!template.type || !template.title || !template.message) {
      throw new Error('Template must have type, title, and message');
    }

    // Add to templates
    notificationTemplates[key] = {
      priority: PRIORITY_LEVELS.NORMAL,
      actionButtons: [],
      ...template
    };

    return true;
  } catch (error) {
    console.error('Error creating custom template:', error);
    return false;
  }
};

/**
 * Update an existing template
 * @param {string} key - Template key
 * @param {Object} updates - Template updates
 * @returns {boolean} Success status
 */
export const updateTemplate = (key, updates) => {
  try {
    if (!hasTemplate(key)) {
      throw new Error(`Template not found: ${key}`);
    }

    notificationTemplates[key] = {
      ...notificationTemplates[key],
      ...updates
    };

    return true;
  } catch (error) {
    console.error('Error updating template:', error);
    return false;
  }
};

/**
 * Delete a custom template (only custom templates, not built-in ones)
 * @param {string} key - Template key
 * @returns {boolean} Success status
 */
export const deleteTemplate = (key) => {
  try {
    // Only allow deletion of custom templates (not built-in ones)
    const customTemplates = ['info', 'success', 'warning', 'error']; // Add more if needed
    
    if (customTemplates.includes(key) || !hasTemplate(key)) {
      throw new Error('Cannot delete built-in templates');
    }

    delete notificationTemplates[key];
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
};

// Export the templates object and utility functions
export { notificationTemplates };
export default notificationTemplates;