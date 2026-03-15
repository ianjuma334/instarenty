export const categoryToAccountMap = {
  deposit: 'working',  // Liquidity
  booking_fee: 'revenue_booking',  // Will sync to revenue_total
  featured_fee: 'revenue_feature',  // Will sync to revenue_total
  registration_fee: 'revenue_activation_holding',  // Activation
  post_upload_holding: 'revenue_post_holding',  // Post upload fees going to holding
  post_net_revenue: 'revenue_net',  // Net revenue from posts (follows landlord pattern)
  referrer_payment: 'revenue_referrer_allocated',  // Allocation (not expense)
  worker_payment: 'revenue_worker_allocated',
  customer_care_payment: 'business_operation',  // ✅ NEW: Deduct from business operation
  staff_salary: 'business_operation',  // ✅ NEW: Deduct from business operation
  withdrawal: 'working',
  refund: 'business_operation',  // ✅ NEW: Refunds reduce business operation
  software: 'business_operation',  // ✅ NEW: Software expenses reduce business operation
  
  // User-friendly expense categories (from frontend) - ✅ NEW: All deduct from business operation
  'Office Supplies': 'business_operation',
  'Utilities': 'business_operation',
  'Marketing': 'business_operation',
  'Equipment': 'business_operation',
  'Travel': 'business_operation',
  'Legal': 'business_operation',
  'Insurance': 'business_operation',
  'Maintenance': 'business_operation',
  'Other': 'business_operation',
  
  other: 'business_operation',
  internal_transfer: null,  // Handled separately
  allocation: null,
};

export const businessCategories = [
  'booking_fee',
  'featured_fee',
  'registration_fee',
  'post_upload_holding'  // Post upload revenue (in holding until approval)
];  // Exclude 'deposit', 'withdrawal'

export const expenseCategories = [
  'staff_salary',      // Staff salary expenses (deducted from business operation)
  'customer_care_payment', // Customer care payment expenses (deducted from business operation)
  'refund',            // Refunds to users (deducted from business operation)
  'software',          // Software expenses (deducted from business operation)
  'Office Supplies',   // User-friendly expense categories (deducted from business operation)
  'Utilities',
  'Marketing',
  'Equipment',
  'Travel',
  'Legal',
  'Insurance',
  'Maintenance',
  'Other'
];

export const systemAccountTypes = [
  'operational',
  'working',
  'revenue',
  'expenses',
  'expenses_total',           // Total operational expenses
  'expenses_staff_salaries',
  'revenue_post_holding',
  'revenue_activation_holding',
  'revenue_renewal_holding',
  'revenue_referral_holding',
  'revenue_feature',
  'revenue_booking',
  'revenue_total',            // ✅ NEW: Unified revenue account
  'revenue_worker_allocated',
  'revenue_worker_pending',
  'revenue_customercare_allocated',
  'revenue_referrer_allocated',
  'revenue_net',
  'revenue_activation',
  'revenue_post',
  // System operation accounts
  'personal_operation',
  'business_operation'
];