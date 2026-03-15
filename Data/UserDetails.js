import mongoose from 'mongoose';

const roles = {
  ADMIN: "admin",
  ASSISTANT_ADMIN: "assistantAdmin",
  LANDLORD: "landlord",
  TENANT: "tenant",
  CUSTOMER_CARE: "customerCare",
  WORKER: "worker"
};

const UserDetailsSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: [true, 'First name is required'],
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters'],
    trim: true
  },
  lname: {
    type: String,
    required: [true, 'Last name is required'],
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    trim: true
  },
  password: {
    type: String,
    required: false, // Not required since we're using Firebase
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  uid: {
    type: String,
    unique: true,
    sparse: true // Allow multiple null values
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    // match: [/^(\+254|0)[17]\d{8}$/, 'Please provide a valid Kenyan phone number'],
    trim: true
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Gender must be male, female, or other'
    }
  },
  county: {
    type: String,
    required: [true, 'County is required'],
    minlength: [2, 'County must be at least 2 characters'],
    maxlength: [50, 'County cannot exceed 50 characters'],
    trim: true
  },
  subcounty: {
    type: String,
    required: [true, 'Subcounty is required'],
    minlength: [2, 'Subcounty must be at least 2 characters'],
    maxlength: [50, 'Subcounty cannot exceed 50 characters'],
    trim: true
  },
  ward: {
    type: String,
    required: [true, 'Ward is required'],
    minlength: [2, 'Ward must be at least 2 characters'],
    maxlength: [50, 'Ward cannot exceed 50 characters'],
    trim: true
  },
  image: { type: String },
  accountBalance: {
    type: Number,
    default: 0
  },
  pendingEarnings: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  monthlySalary: {
    type: Number,
    default: 0,
    min: [0, 'Salary cannot be negative']
  },
  lastSalaryPayment: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: Object.values(roles),
    default: roles.TENANT
  },

  // 👇 Referral system
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    set: function(value) {
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    }
  },

  reportedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  reportCount: {
    type: Number,
    default: 0
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  freeze: {
    type: Boolean,
    default: false
  },
  freezerId: {
    type: String,
    default: null
  },
  freezeNote: {
    type: String,
    default: ''
  },

  // 👇 Approval Fields
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: String, default: "not yet" },

  // 👇 Landlord activation
  isActivated: { type: Boolean, default: false },

  // 👇 Notification System Fields
  fcmTokens: [{
    token: {
      type: String,
      required: true
    },
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true
    },
    deviceName: String,
    isActive: {
      type: Boolean,
      default: true
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  notificationPreferences: {
    enabled: {
      type: Boolean,
      default: true
    },
    categories: {
      booking: {
        type: Boolean,
        default: true
      },
      payment: {
        type: Boolean,
        default: true
      },
      message: {
        type: Boolean,
        default: true
      },
      security: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      },
      system: {
        type: Boolean,
        default: true
      }
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: "22:00",
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
      },
      endTime: {
        type: String,
        default: "08:00",
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
      }
    },
    sound: {
      type: Boolean,
      default: true
    },
    vibration: {
      type: Boolean,
      default: true
    }
  },

}, {
  collation: { locale: 'en_US', strength: 1 },
  timestamps: true, // Add createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔑 Sync referralCode with username on create and update
UserDetailsSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('username')) {
    this.referralCode = this.username;
  }
  next();
});

// 📊 Database indexes for performance
UserDetailsSchema.index({ uid: 1 }, { unique: true, sparse: true }); // Firebase UID lookups
UserDetailsSchema.index({ email: 1 }, { unique: true }); // Login queries
UserDetailsSchema.index({ username: 1 }, { unique: true }); // Username lookups
UserDetailsSchema.index({ role: 1 }); // Role-based queries
UserDetailsSchema.index({ county: 1, subcounty: 1, ward: 1 }); // Location-based queries
UserDetailsSchema.index({ isApproved: 1, isActivated: 1 }); // Status filtering
UserDetailsSchema.index({ referralCode: 1 }); // Referral lookups
UserDetailsSchema.index({ createdAt: -1 }); // Recent users queries
UserDetailsSchema.index({ monthlySalary: 1 }); // Salary queries
UserDetailsSchema.index({ lastSalaryPayment: 1 }); // Payment tracking
// Notification-related indexes
UserDetailsSchema.index({ 'fcmTokens.token': 1 }, { unique: true, sparse: true }); // FCM token lookups
UserDetailsSchema.index({ 'notificationPreferences.enabled': 1 }); // User notification preferences

const User = mongoose.model("Userinfos", UserDetailsSchema);

export { User, roles };
export default User;
