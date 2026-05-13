import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  let query = supabase.from('daily_plans').select('*')
  if (date) query = query.eq('date', date)
  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (date) {
    return NextResponse.json(data?.[0] ?? null)
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('daily_plans')
    .upsert(body, { onConflict: 'date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
