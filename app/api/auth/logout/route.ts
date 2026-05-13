import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth/session'

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true })
  return clearSession(response)
}
