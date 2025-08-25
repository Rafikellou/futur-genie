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

    // Fetch submissions joined to quizzes and classrooms via service role
    const { data: submissions, error } = await admin
      .from('submissions')
      .select(`
        *,
        quiz:quizzes!inner(
          id,
          classroom:classrooms!inner(school_id)
        )
      `)
      .eq('quiz.classroom.school_id', schoolId)

    if (error) {
      console.error('Admin quiz engagement error:', error)
      return NextResponse.json({ error: 'Failed to fetch engagement', details: error }, { status: 500 })
    }

    const submissionsData = (submissions ?? []) as Array<{
      score: number
      total_questions: number
      created_at: string
    }>

    const totalSubmissions = submissionsData.length
    const averageScore = totalSubmissions > 0
      ? submissionsData.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalSubmissions
      : 0

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissionsData.filter(sub => new Date(sub.created_at) > weekAgo).length
    const perfectScores = submissionsData.filter(sub => sub.score === sub.total_questions).length

    return NextResponse.json({
      totalSubmissions,
      averageScore: Math.round(averageScore),
      thisWeekSubmissions,
      perfectScores,
    })
  } catch (e) {
    console.error('Unexpected error computing engagement:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
