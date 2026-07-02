import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1/'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.json(
      { error: { code: '401', message: 'Not authenticated' } },
      { status: 401 },
    )
  }

  let res
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    const cookieHeader = request.headers.get('Cookie')
    if (cookieHeader) headers['Cookie'] = cookieHeader

    res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/me/`, {
      headers,
    })
  } catch (e) {
    return NextResponse.json(
      { error: { code: '502', message: `Backend unreachable: ${(e as Error).message}` } },
      { status: 502 },
    )
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { detail: 'Service temporarily unavailable. Please try again.' },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
