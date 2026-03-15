import mongoose from 'mongoose';

const moneyFlowSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['income', 'expense', 'liability', 'holding'],
    required: true
  },
  category: {
    type: String,
    enum: [
      // Financial transaction categories
      'deposit',           // User deposits money
      'booking_fee',       // Booking payments
      'featured_fee',      // Featured post payments
      'registration_fee',  // Landlord registration fees
      'post_upload_holding', // Post upload fees going to holding account
      'post_net_revenue',  // Net revenue from approved posts (after expenses)
      'referrer_payment',  // Payments to referrers
      'worker_payment',    // Payments to workers
      'staff_salary',      // Monthly staff salary payments
      'withdrawal',        // User withdrawals
      'refund',           // Refunds
      'software',         // Software expenses
      'customer_care_payment',
      'activation_net_revenue',
      'referral',
      'other',             // Other transactions
      
      // User-friendly expense categories (matching frontend)
      'Office Supplies',
      'Utilities',
      'Marketing',
      'Equipment',
      'Travel',
      'Legal',
      'Insurance',
      'Maintenance'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Userinfos',
    required: function() {
      // Required for user-related transactions
      return ['deposit', 'withdrawal', 'referrer_payment', 'registration_fee', 'post_upload_holding', 'post_net_revenue', 'customer_care_payment', 'activation_net_revenue', 'referral'].includes(this.category);
    }
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: function() {
      return ['booking_fee', 'featured_fee'].includes(this.category);
    }
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransactionInfos',
    required: false // Link to transaction if applicable
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collation: { locale: 'en_US', strength: 1 }
});

// Indexes for efficient queries
moneyFlowSchema.index({ type: 1, createdAt: -1 });
moneyFlowSchema.index({ category: 1, createdAt: -1 });
moneyFlowSchema.index({ userId: 1, createdAt: -1 });
moneyFlowSchema.index({ createdAt: -1 });

const MoneyFlow = mongoose.model("MoneyFlow", moneyFlowSchema);

export default MoneyFlow;