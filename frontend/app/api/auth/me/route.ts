import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1/'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.json(
      { error: { code: '401', message: 'Not authenticated' } },
      { status: 401 },
    )
  }

  const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
