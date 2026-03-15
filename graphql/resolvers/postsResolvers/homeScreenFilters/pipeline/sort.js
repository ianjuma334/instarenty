// ✅ Centralized sorting map
export const getSortStage = (filters, first) => {
  if (filters?.isFeatured === true || filters?.sortBy === "featured") {
    return { $sort: { randomOrder: 1 } }; // sort by random order for featured posts
  }

  const sortMap = {
    views: { totalViews: -1 },
    rating: { averageRatings: -1 },
    likes: { totalLikes: -1 },
    dislikes: { totalDislikes: -1 },
    rent: { rent: 1 },             // ascending = cheapest first
    distance: { distanceInKm: 1 }, // ascending = nearest first
  };

  return { $sort: sortMap[filters?.sortBy] || { _id: -1 } };
};
