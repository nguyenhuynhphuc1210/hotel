// types/favorite.types.ts
export interface FavoriteResponse {
    hotel: {
        id: number
        hotelName: string
        city?: string
        thumbnailUrl?: string
        starRating?: number
    }
    createdAt: string
}

export interface FavoritePage {
    content: FavoriteResponse[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}