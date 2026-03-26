export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  phone?: string
  dateOfBirth?: string   
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  avatarUrl?: string
}

export interface AuthResponse {
  token: string
  user: UserResponse
}

// Sửa lại đúng với BE trả về
export interface UserResponse {
  id: number
  fullName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  gender: string | null
  isActive: boolean
  roleId: number
  roleName: 'ROLE_ADMIN' | 'ROLE_HOTEL_OWNER' | 'ROLE_USER'  // ← thẳng, không lồng
  createdAt: string
  updatedAt: string
}