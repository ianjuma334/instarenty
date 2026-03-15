import gql from "graphql-tag";

export default gql`
type Mutation {
        # ====================== POST SHORT MUTATIONS ======================

    createPost(input: UpdatePostInput!): CreatePostResponse!
    updatePost(id: ID!, input: UpdatePostInput!): Post
    confirmAmenities(
        postId: ID!
        confirmations: [AmenityConfirmationInput!]!
    ): Post
    repostPost(postId: ID!, vacancies: Int!): Post
    deletePost(id: ID!): DeleteResponse!
    approveLandlord(id: ID!): ApproveResponse!
    updateReactions(postId: ID!, reaction: Int!, userId: ID!): ReactionResponse
    addReview(postId: ID!, rating: Int!, comment: String): ReviewResponse
    updateReview( postId: ID!, rating: Int!, review: String!): ReviewResponse
    deleteReview(id: ID!): ReviewResponse
    reportPost(postId: ID!, reason: String!): ReportResponse
    booking( postId: ID!, numberBooked: Int!): BookingResponse
    featurePost(postId: ID!): featuredResponse
    registerView(postId: ID!): viewResponse
    activatePost(postId: ID!): ActivateResponse!
    deactivatePost(postId: ID!): ActivateResponse!
    approvePost(postId: ID!): ApprovePostResponse!
    workerGrabPost(postId: ID!): GrabResponse!
    customerGrabPost(postId: ID!): ApprovePostResponse!
    addToFavorites(postId: ID!): FavoriteResponse!
    removeFromFavorites(postId: ID!): FavoriteResponse!


    uploadPostImages(postId: ID!, images: [PostImageInput!]!): UploadPostImagesResponse!
    uploadPostConfirmImages(postId: ID!, workerImages: [PostImageInput!]!): UploadPostImagesResponse!

    # ====================== POST LONG MUTATIONS ======================


    }
`;