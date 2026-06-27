import { NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1/'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password } = body

  const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }

  const response = NextResponse.json(data)
  const isSecure = process.env.NODE_ENV === 'production'

  response.cookies.set('access_token', data.access, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  })

  response.cookies.set('refresh_token', data.refresh, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  })

  return response
}
