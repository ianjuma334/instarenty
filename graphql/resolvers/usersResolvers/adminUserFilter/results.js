// graphql/resolvers/adminFilter.resolver.js

import { filterUsersAdmin } from "./index.js";

export const adminFilterResolvers = {
  Query: {
    adminFilterUsers: async (_, { filters }, context) => {
      // Optional: add authentication check here
      return await filterUsersAdmin(filters);
    },
  },
};
