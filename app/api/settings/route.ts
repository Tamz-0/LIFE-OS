import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkServerSession } from '@/lib/auth/session'

export async function GET(_request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('settings').select('*').single()
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? null)
}

export async function PATCH(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await request.json()

  // Get existing settings first
  const { data: existing } = await supabase.from('settings').select('id').single()

  let result
  if (existing) {
    result = await supabase.from('settings').update(body).eq('id', existing.id).select().single()
  } else {
    result = await supabase.from('settings').insert(body).select().single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}
