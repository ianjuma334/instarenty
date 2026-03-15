import { Amenity } from "../../Data/AmenityDetails.js";
import { User } from "../../Data/UserDetails.js";
import {
  getAmenities,
  createAmenity as createAmenityService,
  updateAmenity as updateAmenityService,
  deleteAmenity as deleteAmenityService,
  loadAmenities
} from "../../services/amenityService.js";

export const amenityResolvers = {
  Query: {
    amenities: async () => {
      try {
        const amenities = getAmenities();
        return amenities.map((a) => ({
          id: a._id.toString(),
          name: a.name,
          type: a.type,
          options: a.options || [],
        }));
      } catch (err) {
        // If cache not loaded, load it
        if (err.message.includes("not loaded yet")) {
          await loadAmenities();
          const amenities = getAmenities();
          return amenities.map((a) => ({
            id: a._id.toString(),
            name: a.name,
            type: a.type,
            options: a.options || [],
          }));
        }
        throw new Error("Failed to fetch amenities");
      }
    },
  },
  Mutation: {
    createAmenity: async (_, { input }, { user }) => {
      console.log('🚀 === GraphQL createAmenity called ===');
      console.log('📥 Input received:', JSON.stringify(input, null, 2));
      console.log('👤 User in context:', JSON.stringify(user, null, 2));

      // Ensure we always return a response object
      try {
        console.log('🔐 Checking authorization...');
        if (!user) {
          console.log('❌ Authorization failed: no user');
          const response = {
            success: false,
            message: 'Unauthorized. Only admins can create amenities.',
            amenity: null
          };
          console.log('🚫 Returning auth failure response:', response);
          return response;
        }

        // Fetch user from DB to get role
        const dbUser = await User.findOne({ uid: user.uid }).select('role');
        if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
          console.log('❌ Authorization failed for user:', dbUser);
          const response = {
            success: false,
            message: 'Unauthorized. Only admins can create amenities.',
            amenity: null
          };
          console.log('🚫 Returning auth failure response:', response);
          return response;
        }

        console.log('📞 Calling service createAmenityService...');
        const amenity = await createAmenityService(input);
        console.log('✅ Service returned amenity:', JSON.stringify(amenity, null, 2));

        const response = {
          success: true,
          message: `Amenity "${amenity.name}" created successfully`,
          amenity: {
            id: amenity._id.toString(),
            name: amenity.name,
            type: amenity.type,
            options: amenity.options || [],
          }
        };
        console.log('🎉 Returning success response:', JSON.stringify(response, null, 2));
        return response;
      } catch (error) {
        console.error('💥 Error in createAmenity resolver:', error);
        console.error('💥 Error stack:', error.stack);
        const errorResponse = {
          success: false,
          message: error.message || 'An unexpected error occurred while creating the amenity.',
          amenity: null
        };
        console.log('🚨 Returning error response:', JSON.stringify(errorResponse, null, 2));
        return errorResponse;
      }
    },

    updateAmenity: async (_, { id, input }, { user }) => {
      if (!user) {
        return {
          success: false,
          message: 'Unauthorized. Only admins can update amenities.',
          amenity: null
        };
      }

      // Fetch user from DB to get role
      const dbUser = await User.findOne({ uid: user.uid }).select('role');
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
        return {
          success: false,
          message: 'Unauthorized. Only admins can update amenities.',
          amenity: null
        };
      }

      try {
        const amenity = await updateAmenityService(id, input);
        return {
          success: true,
          message: `Amenity "${amenity.name}" updated successfully`,
          amenity: {
            id: amenity._id.toString(),
            name: amenity.name,
            type: amenity.type,
            options: amenity.options || [],
          }
        };
      } catch (error) {
        console.error('Error updating amenity:', error);
        return {
          success: false,
          message: error.message || 'An unexpected error occurred while updating the amenity.',
          amenity: null
        };
      }
    },

    deleteAmenity: async (_, { id }, { user }) => {
      if (!user) {
        return {
          success: false,
          message: 'Unauthorized. Only admins can delete amenities.'
        };
      }

      // Fetch user from DB to get role
      const dbUser = await User.findOne({ uid: user.uid }).select('role');
      if (!dbUser || !['ADMIN', 'admin'].includes(dbUser.role)) {
        return {
          success: false,
          message: 'Unauthorized. Only admins can delete amenities.'
        };
      }

      try {
        const deletedAmenity = await deleteAmenityService(id);
        return {
          success: true,
          message: `Amenity "${deletedAmenity.name}" deleted successfully`
        };
      } catch (error) {
        console.error('Error deleting amenity:', error);
        return {
          success: false,
          message: error.message || 'An unexpected error occurred while deleting the amenity.'
        };
      }
    }
  }
};
