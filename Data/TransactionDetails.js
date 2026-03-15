import mongoose from 'mongoose';

const transactionDetailsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: function () {
          return ['feature', 'booking'].includes(this.type);
        },
      },

      type: {
        type: String,
        enum: ['topup', 'withdrawal','feature', 'booking', 'activation','referral','refund', 'debit', 'credit'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 1,
      },
      balanceAfter: {
        type: Number,
        required: true
      },
            
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
      },
      paymentMethod: {
        type: String,
        enum: ['mpesa', 'wallet'],
        default: 'wallet',
      },
      purpose: {
        type: String,
        default: '',
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      }
    },{
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 }
  }
);
const Transaction = mongoose.model("TransactionInfos", transactionDetailsSchema);

export default Transaction;
