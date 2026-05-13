import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'lifeos_session'
const SESSION_VALUE = 'authenticated'

export function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get(SESSION_COOKIE)
  return session?.value === SESSION_VALUE
}

export async function setSession(response: NextResponse): Promise<NextResponse> {
  response.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return response
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE)
  return response
}

export async function checkServerSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  return session?.value === SESSION_VALUE
}
