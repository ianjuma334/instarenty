// AdminFilter/pipeline/lookup.js
export const lookupStage = () => ({
  // You can extend this if you ever need to lookup referrals or more
  $lookup: {
    from: "users", // hypothetical reference collection
    localField: "referredBy",
    foreignField: "_id",
    as: "referrer"
  }
});
