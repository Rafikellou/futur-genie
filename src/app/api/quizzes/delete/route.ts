import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthMeta } from '@/lib/auth-meta'

export async function DELETE(req: NextRequest) {
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

    // Get quiz ID from request body
    const { quizId } = await req.json()

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 })
    }

    // Verify quiz ownership or school access
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select('id, owner_id, school_id')
      .eq('id', quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Check if user has permission to delete this quiz
    if (meta.role === 'TEACHER' && quiz.owner_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own quizzes' }, { status: 403 })
    }

    if (meta.role === 'DIRECTOR' && quiz.school_id !== meta.schoolId) {
      return NextResponse.json({ error: 'You can only delete quizzes from your school' }, { status: 403 })
    }

    // Delete quiz items first (cascade should handle this, but being explicit)
    await admin
      .from('quiz_items')
      .delete()
      .eq('quiz_id', quizId)

    // Delete submissions
    await admin
      .from('submissions')
      .delete()
      .eq('quiz_id', quizId)

    // Delete the quiz
    const { error: deleteError } = await admin
      .from('quizzes')
      .delete()
      .eq('id', quizId)

    if (deleteError) {
      console.error('Quiz deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete quiz: ' + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    console.error('Unexpected error in quizzes/delete:', e)
    return NextResponse.json({ 
      error: 'Unexpected error: ' + (e.message || 'Unknown error')
    }, { status: 500 })
  }
}
