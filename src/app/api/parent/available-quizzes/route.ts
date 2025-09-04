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
          grade
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

    // Get parent's submissions for these quizzes to show completion status
    const { data: submissions, error: submissionsError } = await admin
      .from('submissions')
      .select('quiz_id, created_at')
      .eq('parent_id', claims.userId)
      .order('created_at', { ascending: false })

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError)
      // Don't fail the whole request if submissions can't be fetched
    }

    // Create a map of quiz_id to latest submission date
    const submissionMap = new Map<string, string>()
    if (submissions) {
      submissions.forEach(sub => {
        if (!submissionMap.has(sub.quiz_id)) {
          submissionMap.set(sub.quiz_id, sub.created_at)
        }
      })
    }

    // Get teacher info separately for the classroom
    let teacherName = 'votre enseignant(e)'
    if (quizzes && quizzes.length > 0) {
      const { data: teacher } = await admin
        .from('users')
        .select('full_name')
        .eq('classroom_id', claims.classroomId)
        .eq('role', 'TEACHER')
        .single()
      
      if (teacher?.full_name) {
        teacherName = teacher.full_name
      }
    }

    // Add teacher name and completion status to each quiz
    const quizzesWithTeacher = quizzes?.map(quiz => ({
      ...quiz,
      classroom: {
        ...quiz.classroom,
        teacher: { full_name: teacherName }
      },
      lastSubmissionDate: submissionMap.get(quiz.id) || null,
      isCompleted: submissionMap.has(quiz.id)
    })) || []

    console.log('Successfully fetched quizzes:', { count: quizzesWithTeacher.length, classroomId: claims.classroomId })

    return NextResponse.json({ quizzes: quizzesWithTeacher })
  } catch (error) {
    console.error('Unexpected error in parent/available-quizzes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
