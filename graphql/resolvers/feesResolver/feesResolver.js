import { getFees, updateFees } from "../../../services/feesService.js";

export const feesResolvers = {
  Query: {
    fees: () => getFees(),
  },
  Mutation: {
    updateFees: async (_, { input }) => {
      return await updateFees(input);
    },
  },
};
