// index.js
import interactionResolver  from './interactionResolvers/index.js';
import corePostResolvers  from './corePostResolvers.js';
import featuredPostResolvers from './featuredPostResolvers.js';
import adminPostResolvers from './adminPostResolvers/adminPostResolver.js';
import homeScreenFilters from './homeScreenFilters/homeScreenFilters.js';


const postResolvers = {
  Query: {

    ...homeScreenFilters.Query,
    ...corePostResolvers.Query,
    ...adminPostResolvers.Query,
    ...interactionResolver.Query,
    ...featuredPostResolvers.Query,
  },
  Mutation: {

    ...corePostResolvers.Mutation,
    ...interactionResolver.Mutation,
    ...featuredPostResolvers.Mutation,
    ...adminPostResolvers.Mutation,
  },
};

export default postResolvers;
