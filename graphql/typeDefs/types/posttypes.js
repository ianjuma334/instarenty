import gql from "graphql-tag";

export default gql`
 type Post {
  id: ID!
  userId: User!
  county: String
  subCounty: String
  ward: String
  type: String
  rent: String
  deposite: String
  refundable: String
  numberOfVacancies: Int
  numberOfUnits: Int
  rulesAndRegulations: String
  isActive: Boolean
  photosAvailable: Boolean
  distanceInKm: Float


  # Workflow
  isApproved: Boolean
  isApprovedBy: User
  isConfirmed: Boolean
  isConfirmedBy: User

  # Active grabs
  activeWorkerGrab: Grab
  activeCustomerGrab: Grab

  isExpired: Boolean
  isFeatured: Boolean
  isFlagged: Boolean
  totalViews: Int
  averageRatings: Float
  averageReviews: Float
  termsAndConditions: String
  userReactions: [Reaction]
  images: PostImages
  workerImages: ConfirmedImages
  workerNumberOfUnits: Int
  postgps: GpsLocation
  amenities: [PostAmenity]
  totalLikes: Int
  totalDislikes: Int
}

  #institutions
  type Institution {
    id: ID!
    name: String!
    county: String
    type: String
    ownership: String
    location: GeoJSONPoint
  }

  type GeoJSONPoint {
    type: String
    coordinates: [Float]
  }

type Grab {
  id: ID!
  post: Post!
  grabbedBy: User!
  role: String! 
  grabbedAt: String!
  expiresAt: String!
  isExpired: Boolean!
  penaltyPaid: Boolean!
}

  type GpsLocation {
  longitude: Float
  latitude: Float
}

  type PostImages {
    Windows: String
    Doors: String
    Floor: String
    Roof: String
    Veranda: String
    SittingRoom: String
    BedRoom: String
    BedRoom2: String
    Kitchen: String
    WashRoom: String
}
  type ConfirmedImages {
    ownerwithProperty: String
    photowithOwner: String

}

 type Amenity { 
  id: ID!
  name: String
  type: String
  options: [AmenityOption]
 } 

 type AmenityOption {
  label: String
  value: String
 }

 type PostAmenity {
  amenity: Amenity!   # The linked amenity
  value: String 
  confirmed: Boolean      # The landlord’s chosen value (Yes/No, number, etc.)
}

 type Favorite {
  id: ID!
  userId: ID!
  postId: ID!
  createdAt: String!
}


 type View {
  postId: ID!
  viewerId: ID!
}

  type Review {
    id: ID!
    postId: ID!
    userId: ID!
    rating: Int!
    review: String!
    createdAt: String!
    userFname: String!
    userLname: String!
    userName: String!
    userImage: String
  }

  type Booking{
    postId: ID!
    userId: ID!
    numberBooked: Int!
    fname: String!
    lname: String!
    phone: String!
    username: String!
  }

  type ReactionUpdate {
    postId: ID!
    thumbsUpCount: Int
    thumbsDownCount: Int
  }

# pagination

  type PageInfo {
    hasNextPage: Boolean
    endCursor: String
  }
  # Pagination for posts

  type PostConnection {
    edges: [PostEdge]
    pageInfo: PageInfo
  }

  type Reaction {
  userId: ID!
  type: Int! # 1 = like, 2 = dislike
}

  type UserReaction {
  postId: ID!
  userId: ID!
  type: Int! # 1 = like, 2 = dislike
}

  type PostEdge {
    node: Post
    cursor: String
  }


  # Pagination for bookings
  type BookingConnection {
    edges: [BookingEdge]
    pageInfo: PageInfo
  }

  type BookingEdge {
    node: Booking
    cursor: String
  }


  # Pagination for reviews

  type ReviewConnection {
  edges: [ReviewEdge]
  pageInfo: PageInfo
  }

  type ReviewEdge {
    node: Review
    cursor: String
  }


type Mutation {
  sendMessage(text:String!): String!
}


`;

