import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, name, grade, teacher_id } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'Missing classroom id' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Supabase env missing' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    // 1) Update classroom basic fields
    if (name !== undefined || grade !== undefined) {
      const { error: updErr } = await supabase
        .from('classrooms')
        .update({ ...(name !== undefined ? { name } : {}), ...(grade !== undefined ? { grade } : {}) })
        .eq('id', id)

      if (updErr) {
        return NextResponse.json({ error: updErr.message, code: updErr.code }, { status: 500 })
      }
    }

    // 2) Reassign teacher if provided: set users.classroom_id
    if (teacher_id !== undefined) {
      // First, clear any current teacher assigned to this classroom
      const { error: clearErr } = await supabase
        .from('users')
        .update({ classroom_id: null })
        .eq('classroom_id', id)
        .eq('role', 'TEACHER')

      if (clearErr) {
        return NextResponse.json({ error: clearErr.message, code: clearErr.code }, { status: 500 })
      }

      if (teacher_id) {
        const { error: assignErr } = await supabase
          .from('users')
          .update({ classroom_id: id })
          .eq('id', teacher_id)

        if (assignErr) {
          return NextResponse.json({ error: assignErr.message, code: assignErr.code }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
