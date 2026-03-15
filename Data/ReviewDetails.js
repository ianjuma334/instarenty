import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Userinfos', required: true },
  rating: { type: Number, min: 1, max: 5 },
  review: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Review", ReviewSchema);
