export type AuthUser = {
  id?: string
  email: string
  full_name: string
  role: 'applicant' | 'universitystaff' | 'platformadmin'
  permission_level?: 'officer' | 'admin'
  university?: string
  university_name?: string
  mfa_enabled?: boolean
  mfa_verified?: boolean
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me/')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
