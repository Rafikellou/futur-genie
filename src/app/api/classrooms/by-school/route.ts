import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { schoolId } = await req.json()
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Fetch classrooms first
    const { data: classrooms, error } = await admin
      .from('classrooms')
      .select(`*`)
      .eq('school_id', schoolId)

    if (error) {
      console.error('Admin classrooms by school error:', error)
      return NextResponse.json({ error: 'Failed to fetch classrooms', details: error }, { status: 500 })
    }

    const items = classrooms ?? []

    if (items.length === 0) {
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    // Fetch teachers assigned to these classrooms
    const classroomIds = items.map(c => c.id)
    const { data: teachers, error: teachersErr } = await admin
      .from('users')
      .select('id, full_name, email, classroom_id, role')
      .eq('role', 'TEACHER')
      .in('classroom_id', classroomIds)

    if (teachersErr) {
      console.error('Admin teachers by classroom error:', teachersErr)
      // Return classrooms without teacher info if this fails
      return NextResponse.json({ items }, { status: 200 })
    }

    const teacherByClass: Record<string, any> = {}
    for (const t of teachers || []) {
      if (t.classroom_id) teacherByClass[t.classroom_id] = { id: t.id, full_name: t.full_name, email: t.email }
    }

    const enriched = items.map(c => ({ ...c, teacher: teacherByClass[c.id] || null }))
    return NextResponse.json({ items: enriched }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error classrooms/by-school:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
