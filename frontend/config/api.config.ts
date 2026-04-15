const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  TIMEOUT: 10000,
  ENDPOINTS: {
    // Auth
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    VERIFY_OTP: '/api/auth/verify-otp',
    RESET_PASSWORD: '/api/auth/reset-password',

    // Hotels
    HOTELS: '/api/hotels',
    HOTEL_BY_ID: (id: number | string) => `/api/hotels/${id}`,
    HOTELS_SEARCH: '/api/hotels/search',
    HOTEL_MIN_PRICE: (id: number | string) => `/api/hotels/${id}/min-price`,

    // Bookings
    BOOKINGS: '/api/bookings',
    BOOKING_BY_ID: (id: number | string) => `/api/bookings/${id}`,

    // Users
    USERS: '/api/users',
    USER_BY_ID: (id: number | string) => `/api/users/${id}`,


    AMENITIES: '/api/amenities',
    AMENITY_BY_ID: (id: number | string) => `/api/amenities/${id}`,

    // Hotel Amenities
    HOTEL_AMENITIES: '/api/hotel-amenities',
    HOTEL_AMENITIES_BY_HOTEL: (hotelId: number | string) => `/api/hotel-amenities/hotel/${hotelId}`,
    HOTEL_AMENITY_BY_ID: (hotelId: number | string, amenityId: number | string) => `/api/hotel-amenities/${hotelId}/${amenityId}`,

    // Promotions
    PROMOTIONS: '/api/promotions',
    PROMOTION_BY_ID: (id: number | string) => `/api/promotions/${id}`,


    // Hotel Policies
    HOTEL_POLICIES: '/api/hotel-policies',
    HOTEL_POLICY_BY_ID: (id: number | string) => `/api/hotel-policies/${id}`,

    // Reviews
    REVIEWS: '/api/reviews',
    REVIEW_BY_ID: (id: number | string) => `/api/reviews/${id}`,

    // Room Calendar
    ROOM_CALENDAR: (roomTypeId: number | string) => `/api/room-calendars/room-types/${roomTypeId}`,
    ROOM_CALENDAR_UPDATE: (roomTypeId: number | string) => `/api/room-calendars/room-types/${roomTypeId}/range`,

    // Hotel Images
    HOTEL_IMAGES_UPLOAD: '/api/hotel-images/upload',
    HOTEL_IMAGES_UPLOAD_URL: '/api/hotel-images/url',
    HOTEL_IMAGES_DELETE: '/api/hotel-images/delete',
    HOTEL_IMAGE_SET_PRIMARY: (id: number | string) => `/api/hotel-images/${id}/set-primary`,

    // Hotel Statistics
    HOTEL_STATISTICS: '/api/statistics',
    HOTEL_STATISTIC_BY_ID: (id: number | string) => `/api/hotel-statistics/${id}`,

    // Room Types by Hotel
    ROOM_TYPES: '/api/room-types',
    ROOM_TYPE_BY_ID: (id: number | string) => `/api/room-types/${id}`,

    ROOM_IMAGES_UPLOAD: '/api/room-images/upload',
    ROOM_IMAGES_DELETE: '/api/room-images/delete',
    ROOM_IMAGE_SET_PRIMARY: (id: number | string) => `/api/room-images/${id}/set-primary`,

    // Room Type Amenities
    ROOM_TYPE_AMENITIES: '/api/room-type-amenities',
    ROOM_TYPE_AMENITIES_BY_ROOM_TYPE: (roomTypeId: number | string) => `/api/room-type-amenities/room-type/${roomTypeId}`,
    ROOM_TYPE_AMENITY_BY_ID: (roomTypeId: number | string, amenityId: number | string) => `/api/room-type-amenities/${roomTypeId}/${amenityId}`,

    FAVORITES_TOGGLE: (hotelId: number | string) => `/api/favorites/${hotelId}/toggle`,
    FAVORITES_MY: '/api/favorites/my-favorites',

  },
}

export default API_CONFIG