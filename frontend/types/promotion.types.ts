export interface PromotionResponse {
  id: number
  hotelId: number
  hotelName: string
  promoCode: string
  discountPercent: number
  maxDiscountAmount: number
  startDate: string
  endDate: string
  minOrderValue: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PromotionRequest {
  hotelId: number
  promoCode: string
  discountPercent: number
  maxDiscountAmount: number
  startDate: string
  endDate: string
  minOrderValue?: number
  isActive?: boolean
}