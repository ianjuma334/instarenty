import mongoose, { Schema } from "mongoose";

const AmenitySchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  options: [
    {
      label: { type: String },
      value: { type: String },
    },
  ],
});

// Named export ✅
export const Amenity = mongoose.model("Amenity", AmenitySchema);

// If you also want default export (optional)
export default Amenity;
