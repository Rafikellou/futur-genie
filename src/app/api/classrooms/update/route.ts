import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, name, grade } = body || {}

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

    // Teacher assignments are handled separately via user management

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
