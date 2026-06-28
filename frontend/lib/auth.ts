import { fetchAPI } from './api'

export type AuthUser = {
  id: string
  email: string
  full_name: string
  role: 'applicant' | 'university_staff' | 'platform_admin'
  permission_level?: 'officer' | 'admin'
  university?: string
  university_name?: string
  mfa_enabled: boolean
  mfa_verified: boolean
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    return await fetchAPI<AuthUser>('auth/me/')
  } catch {
    return null
  }
}
