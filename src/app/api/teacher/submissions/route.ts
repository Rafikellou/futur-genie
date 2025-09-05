import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthMeta } from '@/lib/auth-meta'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !serviceRoleKey || !anonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create clients
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    const regularClient = createClient(url, anonKey, { auth: { persistSession: false } })
    
    // Verify the user token
    const { data: { user }, error: userError } = await regularClient.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const meta = getAuthMeta({ user } as any)
    if (meta.role !== 'TEACHER' && meta.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Access denied - teachers and directors only' }, { status: 403 })
    }

    console.log('=== API teacher/submissions called ===')
    console.log('Environment check:', { hasUrl: !!url, hasServiceRole: !!serviceRoleKey, hasAnonKey: !!anonKey })
    console.log('Auth header present:', !!authHeader)
    console.log('Token extracted, length:', token.length)
    
    console.log('Verifying user token...')
    console.log('User verified:', { id: user.id, email: user.email })
    
    console.log('User meta:', {
      userId: meta.userId,
      role: meta.role,
      schoolId: meta.schoolId,
      classroomId: meta.classroomId
    })

    // Get teacher's classroom submissions using service role
    const { data: submissions, error: submissionsError } = await admin
      .from('submissions')
      .select(`
        id,
        quiz_id,
        parent_id,
        answers,
        score,
        total_questions,
        created_at,
        quizzes!inner (
          id,
          title,
          classroom_id
        ),
        users!submissions_parent_id_fkey (
          id,
          full_name,
          child_first_name
        )
      `)
      .eq('quizzes.classroom_id', meta.classroomId)
      .order('created_at', { ascending: false })

    if (submissionsError) {
      console.error('Submissions fetch error:', submissionsError)
      return NextResponse.json({ error: 'Failed to fetch submissions: ' + submissionsError.message }, { status: 500 })
    }

    console.log('Submissions found:', submissions?.length || 0)

    return NextResponse.json({ submissions: submissions || [] }, { status: 200 })
  } catch (e: any) {
    console.error('Unexpected error in teacher/submissions:', e)
    return NextResponse.json({ 
      error: 'Unexpected error: ' + (e.message || 'Unknown error')
    }, { status: 500 })
  }
}
