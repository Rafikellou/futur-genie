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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Get all submissions for this parent
    const { data: submissions, error } = await admin
      .from('submissions')
      .select('score, total_questions, created_at')
      .eq('parent_id', claims.userId)

    if (error) {
      console.error('Error fetching parent stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Calculate statistics - Fix score calculation
    const totalQuizzesTaken = submissions?.length || 0
    const scorePercentages = submissions?.map(s => (s.score / s.total_questions) * 100) || []
    const averageScore = scorePercentages.length > 0 ? scorePercentages.reduce((a, b) => a + b, 0) / scorePercentages.length : 0
    const perfectScores = submissions?.filter(s => s.score === s.total_questions).length || 0
    const bestScore = scorePercentages.length > 0 ? Math.max(...scorePercentages) : 0

    // This week's quizzes
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const thisWeekQuizzes = submissions?.filter(s => 
      new Date(s.created_at) >= oneWeekAgo
    ).length || 0

    const stats = {
      totalQuizzesTaken,
      averageScore: Math.round(averageScore),
      thisWeekQuizzes,
      perfectScores,
      bestScore: Math.round(bestScore)
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Unexpected error in parent/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
