export interface ReviewImageResponse {
  id: number
  imageUrl: string
  publicId: string
}

export interface ReviewRequest {
  bookingId: number
  rating: number
  comment: string
}

export interface ReviewReplyRequest {
  reply: string
}

export interface ReviewReportRequest {
  reason: string
}

export interface ReviewResolveRequest {
  isHideApproved: boolean
}

export interface ReviewResponse {
  id: number
  bookingId: number
  userId: number
  userName: string
  hotelId: number
  hotelName: string
  rating: number
  comment: string | null
  isPublished: boolean
  createdAt: string
  ownerReply?: string | null
  replyDate?: string | null
  isReported?: boolean
  reportReason?: string | null
  images?: ReviewImageResponse[]
}