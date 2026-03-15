// server/seed/AmenitySeeder.js
import mongoose from "mongoose";
import { Amenity } from "../Data/AmenityDetails.js"; // fixed path

const MONGO_URI =
  "mongodb+srv://iangadina2:Swalkerxpertme136479@cluster0.uxqy4f3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const amenities = [
  {
    name: "Electricity",
    type: "availability",
    options: [
      { label: "24/7", value: "24_7" },
      { label: "Daytime Only", value: "daytime" },
      { label: "Night Only", value: "night" },
      { label: "Unavailable", value: "unavailable" },
    ],
  },
  {
    name: "WiFi",
    type: "boolean",
    options: [],
  },
  {
    name: "Water",
    type: "availability",
    options: [
      { label: "24/7", value: "24_7" },
      { label: "Intermittent", value: "intermittent" },
      { label: "Unavailable", value: "unavailable" },
      { label: "Other", value: "other" },
    ],
  },
  {
    name: "Parking",
    type: "boolean",
    options: [],
  },
  {
    name: "CCTV",
    type: "boolean",
    options: [],
  },
  {
    name: "Balcony",
    type: "boolean",
    options: [],
  },
  {
    name: "Tiles",
    type: "boolean",
    options: [],
  },
  {
    name: "Washroom",
    type: "availability",
    options: [
      { label: "Shared", value: "shared" },
      { label: "Private", value: "private" },
      { label: "None", value: "none" },
    ],
  },
  {
    name: "Air Conditioning",
    type: "boolean",
    options: [],
  },
  {
    name: "Sink",
    type: "availability",
    options: [
      { label: "Kitchen", value: "kitchen" },
      { label: "Bathroom", value: "bathroom" },
      { label: "None", value: "none" },
    ],
  },
  {
    name: "Security",
    type: "availability",
    options: [
      { label: "Guard", value: "guard" },
      { label: "Gated", value: "gated" },
      { label: "None", value: "none" },
    ],
  },
];

const seedAmenities = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ Connected to MongoDB");

    await Amenity.deleteMany();
    console.log("🗑️ Cleared old amenities");

    await Amenity.insertMany(amenities);
    console.log("🌱 Amenities seeded successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding amenities:", error);
    process.exit(1);
  }
};

seedAmenities();
