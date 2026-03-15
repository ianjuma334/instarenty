import mongoose from 'mongoose';
import { lookups } from './lookups.js';
import { addFields } from './addFields.js';
import { project } from './project.js';
import { getSortStage } from './sort.js';

export const buildPipeline = (match, filters, first, after) => {
  const pipeline = [];

  // ✅ Geo filter (with radius support)
  if (filters?.gps?.longitude != null && filters?.gps?.latitude != null) {
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [filters.gps.longitude, filters.gps.latitude],
        },
        distanceField: "distanceInMeters",
        spherical: true,
        key: "postgps",
        ...(filters.gps.radiusKm
          ? { maxDistance: filters.gps.radiusKm * 1000 } // within radius
          : {}),
      },
    });

    pipeline.push({
      $addFields: {
        distanceInKm: { $round: [
          { $divide: ["$distanceInMeters", 1000] }, 3,
        ]},
      },
    });
  }

  // ✅ Pagination support
  if (after && filters?.isFeatured !== true && filters?.sortBy !== "featured") {
    pipeline.push({
      $match: { ...match, _id: { $lt: new mongoose.Types.ObjectId(after) } },
    });
  } else {
    pipeline.push({ $match: match });
  }

  // ✅ Random sampling for featured posts (database-level randomization)
  if (filters?.isFeatured === true || filters?.sortBy === "featured") {
    pipeline.push({ $sample: { size: 1000 } }); // Sample up to 1000 random featured posts
    // Add random field for additional randomization on each request
    pipeline.push({
      $addFields: {
        randomOrder: { $rand: {} }
      }
    });
  }

  // ✅ Joins and computed fields
  pipeline.push(...lookups);
  pipeline.push(addFields);

  // ✅ Sorting
  if (filters?.gps) {
    // GeoNear already sorts by distance; 
    // explicitly re-sort only if sortBy === "distance"
    if (filters?.sortBy === "distance") {
      pipeline.push({ $sort: { distanceInKm: 1 } });
    }
  } else {
    pipeline.push(getSortStage(filters, first));
  }

  // ✅ Projection
  pipeline.push(project);

  // ✅ Limit
  pipeline.push({ $limit: first });

  return pipeline;
};
