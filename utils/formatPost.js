// utils/formatPost.js
export const formatPost = (post) => {
  // ✅ Force into PostImages shape
  const allImages = {
    BedRoom: post.image || null,
    BedRoom2: post.image2 || null,
    BedRoom3: post.image3 || null,
    ...(post.images ? Object.fromEntries(post.images) : {}),
  };

  // ✅ Format amenities properly
  const amenities = (post.amenities || []).map((a) => ({
    amenity: a.amenity?._id,
    name: a.amenity?.name || null,
    type: a.amenity?.type || null,
    value: a.value,
  }));

  return {
    id: post._id,
    rent: post.rent,
    county: post.county,
    subCounty: post.subCounty,
    ward: post.ward,
    type: post.type,
    numberOfVacancies: post.numberOfVacancies,
    termsAndConditions: post.termsAndConditions,
    refundable: post.refundable,
    deposite: post.deposite,
    isActive: post.isActive, // ✅ CRITICAL FIX: Include isActive field
    amenities,
    images: allImages,
    userId:
      post.userId || {
        fname: "Unknown",
        lname: "",
        _id: null,
        image: null,
      },
    averageRatings: post.averageRatings || 0,
    totalLikes: post.totalLikes || 0,
    totalDislikes: post.totalDislikes || 0,
    totalViews: post.totalViews || 0,
  };
};

// Helper for paginated results
export const formatPaginatedPosts = (paginated) => {
  const formattedEdges = paginated.edges.map((edge) => ({
    ...edge,
    node: formatPost(edge.node),
  }));
  return {
    ...paginated,
    edges: formattedEdges,
  };
};
