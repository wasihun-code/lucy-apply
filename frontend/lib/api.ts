const API_URL = typeof window === 'undefined'
  ? process.env.API_URL || 'http://backend:8000/api/v1/'
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
