/**
 * Pagination utility functions
 */

/**
 * Parse pagination arguments
 * @param {Object} args - GraphQL arguments
 * @param {number} args.page - Page number (1-based)
 * @param {number} args.limit - Items per page
 * @returns {Object} - Parsed pagination options
 */
export const parsePaginationArgs = (args) => {
  const page = Math.max(1, parseInt(args.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(args.limit) || 10)); // Max 100 items per page
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Execute paginated query
 * @param {Object} model - Mongoose model
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (sort, populate, etc.)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - Paginated results
 */
export const executePaginatedQuery = async (model, query = {}, options = {}, page = 1, limit = 10) => {
  const { skip } = parsePaginationArgs({ page, limit });

  // Execute count query for total
  const total = await model.countDocuments(query);

  // Execute main query with pagination
  const results = await model
    .find(query, null, {
      ...options,
      skip,
      limit,
      sort: options.sort || { createdAt: -1 }
    })
    .populate(options.populate || [])
    .select(options.select || '');

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data: results,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

/**
 * Create pagination info for GraphQL response
 * @param {Array} data - Query results
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - GraphQL pagination object
 */
export const createPaginationInfo = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

/**
 * Validate pagination arguments
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} - Validated pagination args
 */
export const validatePaginationArgs = (page, limit) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

  return { page: validPage, limit: validLimit };
};