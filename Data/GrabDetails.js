import mongoose from 'mongoose';

const GrabSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  grabbedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Userinfos', required: true },
  role: { type: String, enum: ['worker', 'customerCare'], required: true },

  grabbedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },

  isExpired: { type: Boolean, default: false },
  penaltyPaid: { type: Boolean, default: false },
}, { timestamps: true });

const Grab = mongoose.model('Grab', GrabSchema);
export default Grab;
