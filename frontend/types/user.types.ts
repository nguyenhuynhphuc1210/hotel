export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type RoleName = 'ROLE_ADMIN' | 'ROLE_HOTEL_OWNER' | 'ROLE_USER'

export interface UserResponse {
  id: number
  email: string
  fullName: string
  phone: string | null
  dateOfBirth: string | null
  gender: Gender | null
  avatarUrl: string | null
  roleId: number
  roleName: RoleName
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserRequest {
  email: string
  password: string
  fullName: string
  phone?: string
  dateOfBirth?: string
  gender?: Gender
  avatarUrl?: string
  roleId: number
}