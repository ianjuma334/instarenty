// index.js
import favoriteResolvers from "./favoriteResolvers.js";
import reactionAndViewResolvers from "./reactionAndViewResolvers.js";
import reviewResolvers from "./reviewResolvers.js";
import bookingResolvers from "./bookingResolvers.js";
import reportResolvers from "./reportResolvers.js";



const interactionResolvers = {
  Query: {

    ...favoriteResolvers.Query,
    ...reactionAndViewResolvers.Query,
    ...reviewResolvers.Query,
    ...bookingResolvers.Query,
  },
  Mutation: {

    ...favoriteResolvers.Mutation,
    ...reactionAndViewResolvers.Mutation,
    ...reviewResolvers.Mutation,
    ...bookingResolvers.Mutation,
    ...reportResolvers.Mutation,
  },
};

export default interactionResolvers;
