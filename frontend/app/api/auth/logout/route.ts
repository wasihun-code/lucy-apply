import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1/'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: { code: '401', message: 'Not authenticated' } },
      { status: 401 },
    )
  }

  const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/logout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refresh: refreshToken }),
  })

  const data = res.ok ? null : await res.json().catch(() => null)
  const response = new NextResponse(data ? JSON.stringify(data) : null, {
    status: res.ok ? 205 : res.status,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
  })

  response.cookies.set('access_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 })

  return response
}
