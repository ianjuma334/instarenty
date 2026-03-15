import mongoose from 'mongoose';

export const paginateResults = async ({
  model,
  after,
  limit,
  filter = {},
  populate = null,
  select = '',
}) => {
  const query = after
    ? { ...filter, _id: { $lt: new mongoose.Types.ObjectId(after) } }
    : filter;

  let queryBuilder = model
    .find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .select(select);

  // Apply populate if provided
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((pop) => {
        queryBuilder = queryBuilder.populate(pop);
      });
    } else {
      queryBuilder = queryBuilder.populate(populate);
    }
  }

  const results = await queryBuilder.exec();

  const hasNextPage = results.length === limit;
  const endCursor = hasNextPage ? results[results.length - 1]._id : null;

  return {
    edges: results.map((doc) => ({
      node: doc,
      cursor: doc._id,
    })),
    pageInfo: {
      hasNextPage,
      endCursor,
    },
  };
};
