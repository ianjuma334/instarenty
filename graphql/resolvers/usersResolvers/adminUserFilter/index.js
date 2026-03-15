// AdminFilter/index.js
import { buildUserFilters } from "./filters.js";
import { buildPipeline } from "./pipeline/index.js";
import User from "../../../../Data/UserDetails.js"; // Adjust path as needed

export const filterUsersAdmin = async (args) => {
  const {
    page,
    limit,
    county,
    subcounty,
    ward,
    role,
    isFlagged,
    freeze,
    isApproved,
    isActivated
  } = args;

  const filters = buildUserFilters({
    county,
    subcounty,
    ward,
    role,
    isFlagged,
    freeze,
    isApproved,
    isActivated
  });

  const pipeline = buildPipeline({ filters, page, limit });

  const results = await User.aggregate(pipeline);
  const totalCount = await User.countDocuments(filters);

  return {
    users: results,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page
  };
};
