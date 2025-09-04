import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { name, grade, school_id, teacher_id } = body || {}

    if (!name || !grade || !school_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Supabase env missing' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    // 1) Create classroom (no teacher_id column in classrooms table)
    const { data: classroom, error: createErr } = await supabase
      .from('classrooms')
      .insert({ name, grade, school_id } as any)
      .select('id')
      .single()

    if (createErr) {
      return NextResponse.json({ error: createErr.message, code: createErr.code }, { status: 500 })
    }

    // 2) Optionally assign a teacher by setting users.classroom_id
    if (teacher_id) {
      const { error: assignErr } = await supabase
        .from('users')
        .update({ classroom_id: classroom!.id })
        .eq('id', teacher_id)

      if (assignErr) {
        return NextResponse.json({ error: assignErr.message, code: assignErr.code }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, classroom_id: classroom!.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
