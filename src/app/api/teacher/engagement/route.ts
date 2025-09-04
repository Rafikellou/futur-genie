import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthMeta } from '@/lib/auth-meta'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    
    // Create a regular client to verify the user token
    const regularClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    
    // Verify the user token
    const { data: { user }, error: userError } = await regularClient.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const meta = getAuthMeta({ user } as any)
    if (meta.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied - teachers only' }, { status: 403 })
    }

    // Get teacher's classroom
    const { data: userProfile, error: profileError } = await admin
      .from('users')
      .select('classroom_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 })
    }

    if (!userProfile?.classroom_id) {
      // Return default stats if no classroom
      return NextResponse.json({ 
        stats: {
          totalQuizzes: 0,
          totalSubmissions: 0,
          averageScore: 0,
          thisWeekQuizzes: 0,
          perfectScores: 0,
          bestScore: 0
        }
      }, { status: 200 })
    }

    // Get quizzes for teacher's classroom
    const { data: quizzes, error: quizzesError } = await admin
      .from('quizzes')
      .select('id, created_at')
      .eq('classroom_id', userProfile.classroom_id)

    if (quizzesError) {
      return NextResponse.json({ error: 'Failed to get quizzes' }, { status: 500 })
    }

    const quizIds = (quizzes || []).map(q => q.id)
    
    // Get submissions for these quizzes
    let submissions: Array<{score: number, total_questions: number, created_at: string}> = []
    if (quizIds.length > 0) {
      const { data: submissionsData, error: submissionsError } = await admin
        .from('submissions')
        .select('score, total_questions, created_at')
        .in('quiz_id', quizIds)

      if (submissionsError) {
        return NextResponse.json({ error: 'Failed to get submissions' }, { status: 500 })
      }
      
      submissions = submissionsData || []
    }

    // Calculate stats
    const totalQuizzes = quizzes?.length || 0
    const totalSubmissions = submissions.length
    
    const scores = submissions.map(s => (s.score / s.total_questions) * 100)
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const bestScore = scores.length > 0 ? Math.round(Math.max(...scores)) : 0
    const perfectScores = scores.filter(score => score === 100).length

    // This week quizzes
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const thisWeekQuizzes = (quizzes || []).filter(q => new Date(q.created_at) >= oneWeekAgo).length

    const stats = {
      totalQuizzes,
      totalSubmissions,
      averageScore,
      thisWeekQuizzes,
      perfectScores,
      bestScore
    }

    return NextResponse.json({ stats }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error teacher/engagement:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
