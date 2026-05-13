import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')
  const habitId = searchParams.get('habit_id')

  let query = supabase.from('habit_entries').select('*')
  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)
  if (habitId) query = query.eq('habit_id', habitId)

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

  // Upsert: update existing entry or create new one
  const { data, error } = await supabase
    .from('habit_entries')
    .upsert(body, { onConflict: 'habit_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const habitId = searchParams.get('habit_id')
  const date = searchParams.get('date')

  if (!habitId || !date) {
    return NextResponse.json({ error: 'habit_id and date required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('habit_entries')
    .delete()
    .eq('habit_id', habitId)
    .eq('date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
