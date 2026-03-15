import mongoose from 'mongoose';

const ReactionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: Number, enum: [0,1, 2], default : 0 } // 1 for like, 2 for dislike
},
{ collation: { locale: 'en_US', strength: 1 } }
);

const Reaction = mongoose.model('Reaction', ReactionSchema);

export default Reaction;
