import Amenity from '../../../../Data/AmenityDetails.js';
import mongoose from 'mongoose';

export const buildFilters = async (filters) => {
  const match = {
    isFlagged: false,
    isApproved: true,
    isActive: true,
    numberOfVacancies: { $gt: 0 },
    photosAvailable: true,

  };

  // Location/type/rent filters
  if (filters?.location?.county) match.county = filters.location.county;
  if (filters?.location?.subCounty) match.subCounty = filters.location.subCounty;
  if (filters?.location?.ward) match.ward = filters.location.ward;
  if (filters?.type) match.type = filters.type;
  if (filters?.isFeatured === true || filters?.sortBy === "featured") match.isFeatured = true;

  // filter vacancies


  // Rent range
  if (filters?.minRent != null || filters?.maxRent != null) {
    match.rent = {};
    if (filters.minRent != null) match.rent.$gte = filters.minRent;
    if (filters.maxRent != null) match.rent.$lte = filters.maxRent;
  }

  // Amenity filters
  if (filters?.amenities?.length) {
    const amenityNames = filters.amenities.map(a => a.name);
    const amenityDocs = await Amenity.find({ name: { $in: amenityNames } });

    const amenityFilterMap = {};
    for (let doc of amenityDocs) {
      const matchAmenity = filters.amenities.find(a => a.name === doc.name);
      if (matchAmenity) {
        amenityFilterMap[doc._id.toString()] = matchAmenity.value;
      }
    }

    const amenityFilters = Object.entries(amenityFilterMap).map(([id, value]) => ({
      amenities: {
        $elemMatch: {
          amenity: new mongoose.Types.ObjectId(id),
          value: value,
        }
      }
    }));

    if (amenityFilters.length) {
      match.$and = match.$and ? [...match.$and, ...amenityFilters] : [...amenityFilters];
    }
  }

  return match;
};
