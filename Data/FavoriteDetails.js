import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

FavoriteSchema.index({ userId: 1, postId: 1 }, { unique: true }); // prevent duplicates

const Favorite = mongoose.model("Favorite", FavoriteSchema);
export default Favorite;
