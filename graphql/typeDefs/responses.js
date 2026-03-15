// In approval.js
import { gql } from 'graphql-tag';

export default gql` 
type RegisterResponse {
    success: Boolean!
    message: String!
    token: String
    user: User
  }

  type LoginResponse {
    success: Boolean!
    message: String
    token: String
    user: User
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }

  type PromotionResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type FreezeResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type UnFreezeResponse {
    success: Boolean!
    message: String!
    user: User!
  }

  type TransactionResponse {
    success: Boolean!
    message: String!
    transaction: Transaction
  }

  type ReportResponse {
    success: Boolean!
    message: String
    report: Report
  }

  type ReviewResponse {
    success: Boolean!
    message: String
    review: Review
  }

  type ApprovalResponse {
    success: Boolean!
    message: String!
    approval: Approval
  }

  type ApproveResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type ReactionResponse{
    success: Boolean!
    message: String
    reaction: ReactionUpdate
  }

  type BookingResponse {
    success: Boolean!
    message: String
    booking: Booking
  }
  type featuredResponse {
    success: Boolean!
    message: String
    post: Post
  }

  type viewResponse {
    success: Boolean!
    message: String
    view: View
  }

  type ActivateResponse {
    success: Boolean!
    message: String
    post: Post
  }

  type ApprovePostResponse {
    success: Boolean!
    message: String
    post: Post
  }
  type UnFlagResponse {
    success: Boolean!
    message: String
    post: Post
  }

  type FavoriteResponse {
    success: Boolean!
    message: String
    favorite: Favorite
  }
  type UploadPostImagesResponse {
  success: Boolean!
  message: String!
}

type UploadPostImagesResponse {
  success: Boolean!
  message: String!
  post: Post!
}
type GrabResponse {
  success: Boolean!
  message: String!
  grab: Grab
  post: Post
}

type AmenityMutationResponse {
  success: Boolean!
  message: String!
  amenity: Amenity
}

type SaveImageResponse {
  success: Boolean!
  message: String!
  imagePath: String
}

type ValidationResult {
  success: Boolean!
  message: String!
  isValid: Boolean!
}

type MoneyFlowMutationResponse {
  success: Boolean!
  message: String!
  moneyFlow: MoneyFlow
}

type StaffSalaryPreview {
  staff: [User!]!
  totals: SalaryTotals!
  currentRevenueNet: Float!
  remainingAfterPayment: Float!
}

type SalaryTotals {
  workerTotal: Float!
  ccTotal: Float!
  adminTotal: Float!
  grandTotal: Float!
}

type UpdateStaffSalaryResponse {
  success: Boolean!
  message: String!
  user: User
}

type PayStaffSalariesResponse {
  success: Boolean!
  totalPaid: Float!
  staffCount: Int!
}
`;
