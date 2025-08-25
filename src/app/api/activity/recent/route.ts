import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { schoolId, limit = 10 } = await req.json()
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    const { data, error } = await admin
      .from('submissions')
      .select(`
        *,
        student:users!inner(id, full_name),
        quiz:quizzes!inner(
          id,
          title,
          classroom:classrooms!inner(school_id)
        )
      `)
      .eq('quiz.classroom.school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Admin recent activity error:', error)
      return NextResponse.json({ error: 'Failed to fetch recent activity', details: error }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error computing recent activity:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
