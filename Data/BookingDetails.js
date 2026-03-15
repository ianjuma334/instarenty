import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  numberBooked: Number,
  date: { type: Date, default: Date.now }
});

export default mongoose.model("Booking", BookingSchema);
