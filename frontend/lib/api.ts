const API_URL = typeof window === 'undefined'
  ? process.env.API_URL || 'http://localhost:8000/api/v1/'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

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
