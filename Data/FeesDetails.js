import mongoose from "mongoose";

const feeSchema = new mongoose.Schema({
  activationFee: { type: Number, required: true },
  postRenewalFee: { type: Number, required: true },
  featurePostFee: { type: Number, required: true },
  bookingFee: { type: Number, required: true },
  referralBonus: { type: Number, required: true },
  postUploadFee: { type: Number, required: true, default: 0 },
  workerPercentage: { type: Number, required: true, default: 0 },
  customerCarePercentage: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export default mongoose.model("Fee", feeSchema);
