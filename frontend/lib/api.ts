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
    const body = await parseErrorBody(res)
    throw new ApiError(res.status, body.message, body.raw)
  }
  return res.json()
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function extractErrorMessage(json: unknown): string | null {
  if (typeof json !== 'object' || !json) return null
  const obj = json as Record<string, unknown>
  if (typeof obj.detail === 'string') return obj.detail
  if (typeof obj.message === 'string') return obj.message
  const error = obj.error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (typeof errObj.message === 'string') return errObj.message
    if (typeof errObj.code === 'string') return errObj.code
  }
  return null
}

function parseErrorBody(res: Response): Promise<{ message: string; raw: unknown }> {
  return res.text().then((text) => {
    if (!text) return { message: `HTTP ${res.status}`, raw: null }
    if (text.length > 200) return { message: `HTTP ${res.status}`, raw: text }
    try {
      const json = JSON.parse(text)
      const extracted = extractErrorMessage(json)
      return {
        message: extracted ?? text,
        raw: json,
      }
    } catch {
      return { message: text, raw: text }
    }
  })
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message)
      const extracted = extractErrorMessage(parsed)
      if (extracted) return extracted
    } catch {}
    return err.message
  }
  return 'An unexpected error occurred'
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
  accreditation_info?: string
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

export interface HistoryItem {
  from_status: string | null
  to_status: string
  changed_by_type: string
  reason: string
  created_at: string
}

export interface UploadUrlResponse {
  upload_url: string | null
  object_key: string
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
  document_verified_count?: number
  document_total_count?: number
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

// Legacy functions (login, fetchAdminUniversities, createUniversity, fetchStaff, inviteStaff, removeStaff) were removed in FE-16 — use fetchAPI instead.
