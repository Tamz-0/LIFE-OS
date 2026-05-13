import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const appPassword = process.env.APP_PASSWORD
    if (!appPassword) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (password !== appPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    return await setSession(response)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
