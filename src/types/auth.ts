export type UserRole = 'owner' | 'admin' | 'teacher'

export interface UserProfile {
  id: string
  institute_id: string
  full_name: string
  role: UserRole
  email?: string
  created_at?: string
  updated_at?: string
}

export interface Institute {
  id: string
  name: string
  tagline?: string | null
  affiliation?: string | null
  address?: string | null
  contact?: string | null
  logo_path?: string | null
  created_at?: string
  updated_at?: string
}

export interface AdminCreateTeacherPayload {
  email: string
  password: string
  full_name: string
  role: 'teacher' | 'admin'
}

export interface AdminResetPasswordPayload {
  user_id: string
  new_password: string
}

export interface AdminRevokeTeacherPayload {
  user_id: string
}

export interface AdminOperationResult {
  success: boolean
  message: string
  user?: Partial<UserProfile>
  error?: string
}
