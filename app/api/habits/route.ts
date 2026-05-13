import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('archived') === 'true'

  let query = supabase.from('habits').select('*').order('sort_order')
  if (!includeArchived) query = query.is('archived_at', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('habits')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
