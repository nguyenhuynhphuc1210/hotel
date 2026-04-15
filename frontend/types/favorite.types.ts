export interface FavoriteResponse {
    userId: number
    userEmail: string
    hotelId: number
    hotelName: string
    hotelCity?: string
    hotelThumbnail?: string
    hotelStarRating?: number
    createdAt: string
}

export interface FavoritePage {
    content: FavoriteResponse[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}