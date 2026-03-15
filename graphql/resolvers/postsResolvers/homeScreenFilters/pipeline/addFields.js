export const addFields = {
    
    $addFields: {
      totalViews: { $size: '$views' },
      averageRatings: { $avg: '$reviews.rating' },
      totalLikes: {
        $size: {
          $filter: {
            input: '$reactions',
            as: 'reaction',
            cond: { $eq: ['$$reaction.type', 1] },
          },
        },
      },
      totalDislikes: {
        $size: {
          $filter: {
            input: '$reactions',
            as: 'reaction',
            cond: { $eq: ['$$reaction.type', 2] },
          },
        },
      },
    },
  };
  