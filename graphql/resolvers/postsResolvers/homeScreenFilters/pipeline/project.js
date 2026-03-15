export const project = {
  $project: {
    id: '$_id',
    county: 1,
    subCounty: 1,
    ward: 1,
    type: 1,
    rent: 1,
    numberOfVacancies: 1,
    isFeatured: 1,
    isActive: 1, // ✅ CRITICAL FIX: Include isActive field
    totalViews: 1,
    averageRatings: 1,
    totalLikes: 1,
    totalDislikes: 1,
    images: 1,

    // ✅ expose coordinates clearly
    postgps: {
      latitude: { $arrayElemAt: ["$postgps.coordinates", 1] },
      longitude: { $arrayElemAt: ["$postgps.coordinates", 0] },
    },

    // ✅ expose computed distance
    distanceInKm: 1,

    userId: {
      _id: '$user._id',
      fname: '$user.fname',
      lname: '$user.lname',
    },
  },
};
