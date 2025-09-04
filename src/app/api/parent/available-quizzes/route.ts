import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWT } from '@/lib/auth-meta'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const claims = verifyJWT(token)
    
    if (!claims || claims.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!claims.classroomId) {
      console.error('Parent has no classroom_id:', claims)
      return NextResponse.json({ error: 'Parent not assigned to classroom' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Get published quizzes for this parent's classroom
    const { data: quizzes, error } = await admin
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        level,
        is_published,
        created_at,
        classroom:classrooms(
          id,
          name,
          grade,
          teacher:users!teacher_id(
            id,
            full_name
          )
        )
      `)
      .eq('classroom_id', claims.classroomId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching available quizzes:', error)
      console.error('Query details:', { classroomId: claims.classroomId, role: claims.role })
      return NextResponse.json({ error: 'Failed to fetch quizzes', details: error.message }, { status: 500 })
    }

    console.log('Successfully fetched quizzes:', { count: quizzes?.length, classroomId: claims.classroomId })

    return NextResponse.json({ quizzes: quizzes || [] })
  } catch (error) {
    console.error('Unexpected error in parent/available-quizzes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
