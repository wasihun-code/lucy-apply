const API_URL = typeof window === 'undefined'
  ? process.env.API_URL || 'http://localhost:8000/api/v1/'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

// TODO FE-04: add credentials: 'include' to enable httpOnly cookie auth
export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error)
  }
  return res.json()
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface University {
  id: string
  name: string
  description: string
  logo: string | null
  status: string
  created_at: string
}

export interface Program {
  id: string
  name: string
  degree_level: string
  university: string
  university_name: string
  description: string
  requirements: string
  required_documents: { type: string; label: string }[]
  fee_amount: string
  fee_currency: string
  status: string
  open_cycles: AdmissionCycle[]
}

export interface AdmissionCycle {
  id: string
  name: string
  open_date: string
  close_date: string
  status: string
}

export interface DocumentChecklistItem {
  type: string
  label: string
  status: string | null
  uploaded: boolean
}

export interface Payment {
  id: string
  amount: string
  currency: string
  status: 'pending' | 'succeeded' | 'failed'
  processor_reference: string
  initiated_at: string
  completed_at: string | null
}

export interface PaymentIntentResponse {
  client_secret: string
}

export interface HistoryItem {
  from_status: string | null
  to_status: string
  changed_by_type: string
  reason: string
  created_at: string
}

export interface Application {
  id: string
  program: string
  program_name: string
  university_name: string
  admission_cycle: string
  status: string
  form_data: Record<string, unknown>
  document_checklist: DocumentChecklistItem[]
  payment: Payment | null
  submitted_at: string | null
  decision_at: string | null
  decision_by: string | null
  offer_response_at: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationDocument {
  id: string
  document_type: string
  file: string | null
  object_key: string
  status: string
  flagged_reason: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface UploadUrlResponse {
  upload_url: string | null
  object_key: string
}

export interface AdminUniversity {
  id: string
  name: string
  description: string
  status: string
  program_count: number
  application_count: number
  created_at: string
}

export interface StaffMember {
  id: string
  email: string
  full_name: string
  permission_level: string
  account_status: string
  university: string
}

export async function fetchAdminUniversities(token: string): Promise<AdminUniversity[]> {
  const res = await fetch(`${API_URL}admin/universities/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.results ?? data
}

export async function createUniversity(
  token: string,
  data: { name: string; description: string; accreditation_info?: string }
): Promise<University> {
  const res = await fetch(`${API_URL}universities/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchStaff(token: string, universityId: string): Promise<StaffMember[]> {
  const res = await fetch(`${API_URL}universities/${universityId}/staff/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function inviteStaff(
  token: string,
  universityId: string,
  data: { email: string; full_name: string; permission_level: string }
): Promise<StaffMember> {
  const res = await fetch(`${API_URL}universities/${universityId}/staff/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeStaff(
  token: string,
  universityId: string,
  staffId: string
): Promise<void> {
  const res = await fetch(`${API_URL}universities/${universityId}/staff/${staffId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function login(
  email: string,
  password: string
): Promise<{ access: string; refresh: string }> {
  const res = await fetch(`${API_URL}auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
