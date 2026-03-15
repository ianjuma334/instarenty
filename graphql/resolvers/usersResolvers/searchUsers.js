// resolvers/User/searchUsers.js
import User from "../../../Data/UserDetails.js";

const allowedRoles = ['ADMIN', 'admin', 'ASSISTANT_ADMIN', 'assistantAdmin', 'CUSTOMER_CARE', 'customerCare'];

const searchUsers = {
  Query: {
    async searchUsersByUsername(_, { username, after, limit = 10 }, { user }) {
      if (!user) {
        throw new Error("Unauthorized");
      }

      const dbUser = await User.findOne({ uid: user.uid });
      if (!dbUser || !allowedRoles.includes(dbUser.role)) {
        throw new Error("Unauthorized");
      }

      // Cursor handling
      let query = {
        username: { $regex: username, $options: "i" },
        role: { $ne: "admin" } // ❌ exclude admin users
      };

      if (after) {
        query._id = { $gt: after };
      }

      const results = await User.find(query)
        .sort({ _id: 1 })
        .limit(limit + 1) // fetch one extra to check if next page exists
        .select("-password -__v -freezerId");

      const hasNextPage = results.length > limit;
      const edges = results.slice(0, limit).map((doc) => ({
        node: doc,
        cursor: doc._id,
      }));

      return {
        edges,
        pageInfo: {
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          hasNextPage,
        },
      };
    },
  },
};

export default searchUsers;
