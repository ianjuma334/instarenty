import mongoose from 'mongoose';

const ViewSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
},{
  timestamps: true,
});

export default mongoose.model("View", ViewSchema);
