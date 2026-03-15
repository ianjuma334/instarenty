// models/Institution.js
import mongoose from "mongoose";

const InstitutionSchema = new mongoose.Schema({
  name: String,
  county: String,
  type: String,
  ownership: String,
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },
});

InstitutionSchema.index({ location: "2dsphere" });

export default mongoose.model("Institution", InstitutionSchema);
