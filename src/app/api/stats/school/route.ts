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

    // Users by school
    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('*')
      .eq('school_id', schoolId)
    if (usersErr) {
      console.error('Admin users error:', usersErr)
      return NextResponse.json({ error: 'Failed to fetch users', details: usersErr }, { status: 500 })
    }

    // Classrooms by school
    const { data: classrooms, error: classesErr } = await admin
      .from('classrooms')
      .select('*')
      .eq('school_id', schoolId)
    if (classesErr) {
      console.error('Admin classrooms error:', classesErr)
      return NextResponse.json({ error: 'Failed to fetch classrooms', details: classesErr }, { status: 500 })
    }

    // Quizzes with classroom join
    const { data: quizzes, error: quizzesErr } = await admin
      .from('quizzes')
      .select(`*, classroom:classrooms!inner(school_id)`) 
      .eq('classroom.school_id', schoolId)
    if (quizzesErr) {
      console.error('Admin quizzes error:', quizzesErr)
      return NextResponse.json({ error: 'Failed to fetch quizzes', details: quizzesErr }, { status: 500 })
    }

    const teachers = (users ?? []).filter(u => u.role === 'TEACHER')
    const parents = (users ?? []).filter(u => u.role === 'PARENT')

    return NextResponse.json({
      totalUsers: users?.length || 0,
      totalTeachers: teachers.length,
      totalStudents: parents.length, // Each parent represents one student
      totalParents: parents.length,
      totalClasses: classrooms?.length || 0,
      totalQuizzes: quizzes?.length || 0,
      publishedQuizzes: (quizzes ?? []).filter(q => q.is_published).length || 0,
    })
  } catch (e) {
    console.error('Unexpected error computing school stats:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
