 import { gql } from 'apollo-server-express';
 
 export default gql`
  scalar Upload
  
  input UpdatePostInput {
    county: String
    subCounty: String
    ward: String
    type: String
    rent: Int
    deposite: String
    refundable: String
    photosAvailable: Boolean
    workerNumberOfUnits: Int
    numberOfVacancies: Int
    numberOfUnits: Int
    termsAndConditions: String
    postgps: gpsLocation
    isConfirmed: Boolean
    amenities: [AmenityInput!] # 💥 Add this line
}

input gpsLocation{
  longitude: Float
  latitude: Float
}

input AmenityConfirmationInput {
  amenityId: ID!
  confirmed: Boolean!
}

input UpdateFeesInput {
  activationFee: Int
  postRenewalFee: Int
  featurePostFee: Int
  bookingFee: Int
  referralBonus: Int
  postUploadFee: Int
  workerPercentage: Float
  customerCarePercentage: Float
}

input AdminUserFilterInput {
    county: String
    subcounty: String
    ward: String
    role: String
    isFlagged: Boolean
    freeze: Boolean
    isApproved: Boolean
    isActivated: Boolean
    page: Int = 1
    limit: Int = 10
  }

  input CreateReportInput {
    reported: ID!
    reason: String!
  }

  input UpdateReportInput {
    status: String!
    solutionNote: String!
  }

  input AmenityInput {
  amenityId: ID!
  value: String!
}

  input FiltersInput {
    location: LocationInput
    type: String
    isFeatured: Boolean
    minRent: Int
    maxRent: Int
    sortBy:String
    amenities: [AmenityFilterInput!] # 💥 Add this line
    gps: GpsFilter
  }

  input GpsFilter {
    longitude: Float
    latitude: Float
    radiusKm: Float
  }
  input LocationInput {
    county: String
    subCounty: String
    ward: String
  }

  input AmenityFilterInput {
  name: String!
  value: String!
}

input PostImageInput {
   label: String!
   url: String!
 }

# ====================== AMENITY MANAGEMENT INPUTS ======================

input CreateAmenityInput {
  name: String!
  type: String!
  options: [AmenityOptionInput]
}

input UpdateAmenityInput {
  name: String
  type: String
  options: [AmenityOptionInput]
}

input AmenityOptionInput {
  label: String!
  value: String!
}


  `;