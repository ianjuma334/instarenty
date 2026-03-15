import mongoose from "mongoose";
import { Amenity } from "../Data/AmenityDetails.js";

let amenitiesCache = null;

export const loadAmenities = async () => {
  const amenities = await Amenity.find({}).sort({ name: 1 });
  amenitiesCache = amenities;
  console.log("✅ Amenities loaded into cache:", amenities.length, "amenities");
  return amenitiesCache;
};

export const getAmenities = () => {
  if (!amenitiesCache) {
    throw new Error("Amenities not loaded yet. Call loadAmenities() first.");
  }
  return amenitiesCache;
};

export const createAmenity = async (amenityData) => {
  try {
    console.log('🚀 === Service createAmenity called ===');
    console.log('📥 Input data:', JSON.stringify(amenityData, null, 2));

    const { name, type, options } = amenityData;

    // Validate required fields
    if (!name || !type) {
      console.error('❌ Validation failed - missing name or type');
      throw new Error("Name and type are required fields");
    }

    console.log('✅ Validated input - name:', name, 'type:', type);

    // Check if MongoDB connection is working
    console.log('🔍 Checking MongoDB connection...');
    console.log('🔗 Connection readyState:', mongoose.connection.readyState);
    if (mongoose.connection.readyState !== 1) {
      throw new Error(`MongoDB connection not established. ReadyState: ${mongoose.connection.readyState}`);
    }

    // Test basic model operation
    console.log('🧪 Testing Amenity model...');
    try {
      const count = await Amenity.countDocuments();
      console.log('📊 Current amenity count:', count);
    } catch (testError) {
      console.error('❌ Error testing Amenity model:', testError);
      throw new Error(`Amenity model test failed: ${testError.message}`);
    }

    // Check if amenity with same name already exists
    console.log('Checking for existing amenity...');
    const existingAmenity = await Amenity.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingAmenity) {
      console.error('Amenity already exists:', existingAmenity);
      throw new Error(`Amenity "${name}" already exists`);
    }

    console.log('🏗️ Creating new amenity object...');
    const amenity = new Amenity({
      name,
      type,
      options: options || []
    });

    console.log('✅ Amenity object created:', JSON.stringify(amenity.toObject(), null, 2));
    console.log('💾 Saving to database...');

    const savedAmenity = await amenity.save();
    console.log('🎉 Amenity saved successfully:', JSON.stringify(savedAmenity.toObject(), null, 2));

    console.log('🔄 Refreshing cache...');
    await refreshAmenitiesCache();
    console.log('✅ Cache refreshed');

    return savedAmenity;
  } catch (error) {
    console.error('💥 === Error in createAmenity service ===');
    console.error('❌ Error details:', error);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
};

export const updateAmenity = async (amenityId, updates) => {
  try {
    const { name, type, options } = updates;

    // Validate required fields if provided
    if (name === "") {
      throw new Error("Name cannot be empty");
    }
    if (type === "") {
      throw new Error("Type cannot be empty");
    }

    // If updating name, check for duplicates
    if (name) {
      const existingAmenity = await Amenity.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: amenityId } // Exclude current amenity
      });
      if (existingAmenity) {
        throw new Error(`Amenity "${name}" already exists`);
      }
    }

    // Get current amenity before update
    const currentAmenity = await Amenity.findById(amenityId);
    if (!currentAmenity) {
      throw new Error("Amenity not found");
    }

    // Check if options are being changed and if amenity is used in posts
    if (options && JSON.stringify(options) !== JSON.stringify(currentAmenity.options)) {
      const Post = await import("../Data/PostDetails.js");
      const postsUsingAmenity = await Post.default.find({ "amenities.amenity": amenityId });

      if (postsUsingAmenity.length > 0) {
        console.warn(`⚠️ Amenity "${currentAmenity.name}" is used in ${postsUsingAmenity.length} posts. Option changes may affect existing data.`);
        // You could implement migration logic here if needed
        // For example, map old option values to new ones
      }
    }

    const amenity = await Amenity.findByIdAndUpdate(
      amenityId,
      { name, type, options },
      { new: true, runValidators: true }
    );

    if (!amenity) {
      throw new Error("Amenity not found");
    }

    await refreshAmenitiesCache(); // Refresh cache after update
    return amenity;
  } catch (error) {
    console.error('Error in updateAmenity service:', error);
    throw error;
  }
};

export const deleteAmenity = async (amenityId) => {
  try {
    // Check if amenity is used in any posts
    const Post = await import("../Data/PostDetails.js");
    const postsUsingAmenity = await Post.default.find({ "amenities.amenity": amenityId });

    if (postsUsingAmenity.length > 0) {
      throw new Error(`Cannot delete amenity. It is used in ${postsUsingAmenity.length} post(s)`);
    }

    const deletedAmenity = await Amenity.findByIdAndDelete(amenityId);
    if (!deletedAmenity) {
      throw new Error("Amenity not found");
    }

    await refreshAmenitiesCache(); // Refresh cache after deletion
    return deletedAmenity;
  } catch (error) {
    console.error('Error in deleteAmenity service:', error);
    throw error;
  }
};

export const refreshAmenitiesCache = async () => {
  await loadAmenities();
};