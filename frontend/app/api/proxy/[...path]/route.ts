import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1/'

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }, method: string) {
  const token = request.cookies.get('access_token')?.value
  const path = params.path.join('/')

  const url = new URL(`${API_URL.replace(/\/$/, '')}/${path}/`)
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value))

  const headers: Record<string, string> = {}
  const incomingContentType = request.headers.get('Content-Type')
  if (incomingContentType) {
    headers['Content-Type'] = incomingContentType
  } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) headers['Cookie'] = cookieHeader

  let body: string | undefined
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    body = await request.text()
  }

  const res = await fetch(url.toString(), { method, headers, body })

  if (res.status === 204) {
    const response = new NextResponse(null, { status: 204 })
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    for (const cookie of setCookies) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { detail: 'Service temporarily unavailable. Please try again.' },
      { status: res.status },
    )
  }

  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  for (const cookie of setCookies) {
    response.headers.append('Set-Cookie', cookie)
  }
  
  return response
}

export const GET = (request: NextRequest, context: { params: { path: string[] } }) => proxy(request, context, 'GET')
export const POST = (request: NextRequest, context: { params: { path: string[] } }) => proxy(request, context, 'POST')
export const PUT = (request: NextRequest, context: { params: { path: string[] } }) => proxy(request, context, 'PUT')
export const PATCH = (request: NextRequest, context: { params: { path: string[] } }) => proxy(request, context, 'PATCH')
export const DELETE = (request: NextRequest, context: { params: { path: string[] } }) => proxy(request, context, 'DELETE')
