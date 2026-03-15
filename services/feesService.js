import Fees from "../Data/FeesDetails.js";

let feesCache = null;

export const loadFees = async () => {
  let fees = await Fees.findOne();
  if (!fees) {
    // Create default fees if not found
    fees = await Fees.create({
      activationFee: 100,
      postRenewalFee: 50,
      featurePostFee: 200,
      bookingFee: 10,
      referralBonus: 20,
      postUploadFee: 0,
      workerPercentage: 0.1,
      customerCarePercentage: 0.05,
    });
    console.log("✅ Created default fees document");
  }
  feesCache = fees;
  console.log("✅ Fees loaded into cache:", fees.toObject());
  return feesCache;
};

export const getFees = () => {
  if (!feesCache) throw new Error("Fees not loaded yet");
  return feesCache;
};

export const updateFees = async (updates) => {
  const fees = await Fees.findOneAndUpdate({}, updates, { new: true, upsert: true });
  if (!fees) throw new Error("Fees document not found to update");
  feesCache = fees; // refresh cache
  console.log("🔄 Fees cache updated:", fees.toObject());
  return feesCache;
};
