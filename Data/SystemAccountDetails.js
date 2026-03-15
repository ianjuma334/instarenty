import mongoose from 'mongoose';

const systemAccountSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'operational',
      'working',
      'revenue',
      'expenses',
      'user_liability',
      // Revenue holding accounts
      'revenue_post_holding',
      'revenue_activation_holding',
      'revenue_renewal_holding',
      'revenue_referral_holding',
      // Direct revenue accounts
      'revenue_feature',
      'revenue_booking',
      // Allocated revenue accounts
      'revenue_worker_allocated',
      'revenue_worker_pending',
      'revenue_customercare_allocated',
      'revenue_referrer_allocated',
      // Net revenue account
      'revenue_net',
      // Unified revenue account (includes all direct revenue)
      'revenue_total',
      // Expense accounts
        // System operation accounts
        'personal_operation',
        'business_operation',
      'expenses_staff_salaries',
      // Legacy accounts (for backward compatibility)
      'revenue_activation',
      'revenue_post'
    ],
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Userinfos',
    required: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collation: { locale: 'en_US', strength: 1 }
});

// Create indexes
systemAccountSchema.index({ type: 1 }, { unique: true });

const SystemAccount = mongoose.model("SystemAccount", systemAccountSchema);

export default SystemAccount;