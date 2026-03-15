// models/Post.js
import mongoose from 'mongoose';

const PostAmenitySchema = new mongoose.Schema({
  amenity: { type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', required: true },
  value: String,
  confirmed: { type: Boolean, default: false },
});

const PostDetailsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Userinfos' },
  county: String,
  subCounty: String,
  ward: String,
  type: String,
  rent: { type: Number, required: true },
  deposite: String,
  refundable: String,
  termsAndConditions: String,
  numberOfUnits: { type: Number },
  numberOfVacancies: { type: Number },
  rulesAndRegulations: String,
  images: { type: Map, of: String },
  workerImages: { type: Map, of: String },
  workerNumberOfUnits: { type: Number },

  // 🔥 GeoJSON Point
  postgps: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },

  // ✅ Post metadata
  photosAvailable: { type: Boolean, default: false },
  isExpired: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  totalViews: { type: Number, default: 0 },
  totalLikes: { type: Number, default: 0 },
  totalDislikes: { type: Number, default: 0 },
  averageRatings: { type: Number, default: 0 },
  averageReviews: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },
  userReactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reaction' }],

  // ✅ Workflow
  isConfirmed: { type: Boolean, default: false }, // worker confirmed
  isConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Userinfos' },

  isApproved: { type: Boolean, default: false }, // customer approved
  isApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Userinfos' },

  // ✅ Grab tracking
  activeWorkerGrab: { type: mongoose.Schema.Types.ObjectId, ref: 'Grab', default: null },
  activeCustomerGrab: { type: mongoose.Schema.Types.ObjectId, ref: 'Grab', default: null },

  // ✅ Amenities
  amenities: [PostAmenitySchema],
}, {
  collation: { locale: 'en_US', strength: 1 }
});

// ✅ Geo index
PostDetailsSchema.index({ postgps: '2dsphere' });

// 📊 Performance indexes
PostDetailsSchema.index({ userId: 1 }); // User's posts
PostDetailsSchema.index({ county: 1, subCounty: 1, ward: 1 }); // Location filtering
PostDetailsSchema.index({ type: 1 }); // Property type filtering
PostDetailsSchema.index({ rent: 1 }); // Price sorting/filtering
PostDetailsSchema.index({ isActive: 1, isApproved: 1 }); // Active approved posts
PostDetailsSchema.index({ isFeatured: 1 }); // Featured posts
PostDetailsSchema.index({ totalViews: -1 }); // Popular posts
PostDetailsSchema.index({ createdAt: -1 }); // Recent posts
PostDetailsSchema.index({ isExpired: 1 }); // Non-expired posts

const Post = mongoose.model("Post", PostDetailsSchema);
export default Post;
