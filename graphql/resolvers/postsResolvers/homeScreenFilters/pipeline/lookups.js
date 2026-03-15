export const lookups = [
  {
    $lookup: {
      from: 'views',
      localField: '_id',
      foreignField: 'postId',
      as: 'views',
    },
  },
  {
    $lookup: {
      from: 'reviews',
      localField: '_id',
      foreignField: 'postId',
      as: 'reviews',
    },
  },
  {
    $lookup: {
      from: 'reactions',
      localField: '_id',
      foreignField: 'postId',
      as: 'reactions',
    },
  },
  {
    $lookup: {
      from: 'userinfos',  // 🔥 Important: MongoDB uses collection name (lowercase!)
      localField: 'userId',
      foreignField: '_id',
      as: 'user',
    },
  },
  {
    $unwind: {
      path: '$user',
      preserveNullAndEmptyArrays: true, // in case user is missing
    },
  },
];
