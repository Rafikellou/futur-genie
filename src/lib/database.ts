import { supabase } from './supabase'
import { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type TablesInsert<T extends keyof Tables> = Tables[T]['Insert']
type TablesUpdate<T extends keyof Tables> = Tables[T]['Update']
type TablesRow<T extends keyof Tables> = Tables[T]['Row']

// User operations
export async function createUser(userData: TablesInsert<'users'>): Promise<TablesRow<'users'>> {
  const { data, error } = await supabase
    .from('users')
    .insert(userData as any)
    .select()
    .single()

  if (error) throw error
  return data as TablesRow<'users'>
}

export async function getUserById(id: string): Promise<TablesRow<'users'>> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as TablesRow<'users'>
}

export async function getUsersBySchool(schoolId: string) {
  const res = await fetch('/api/users/by-school', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId }),
  })
  if (!res.ok) {
    // Try to surface server error details
    const text = await res.text().catch(() => '')
    let msg = 'Failed to fetch users by school'
    try {
      const parsed = JSON.parse(text)
      msg = parsed?.error || msg
    } catch {}
    throw new Error(msg)
  }
  // Be resilient to unexpected shapes
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
    return items
  } catch (e) {
    console.error('users/by-school parse error. Raw response:', text)
    return []
  }
}

// School operations
export async function createSchool(name: string): Promise<TablesRow<'schools'>> {
  const { data, error } = await supabase
    .from('schools')
    .insert({ name } as any)
    .select()
    .single()

  if (error) throw error
  return data as TablesRow<'schools'>
}

export async function getSchoolById(id: string) {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Classroom operations
export async function createClassroom(classroomData: TablesInsert<'classrooms'> & { teacher_id?: string | null }) {
  // Use server API (service role) to bypass RLS and avoid recursion on insert
  const res = await fetch('/api/classrooms/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classroomData),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to create classroom')
  }
}

export async function getClassroomsBySchool(schoolId: string) {
  const res = await fetch('/api/classrooms/by-school', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = 'Failed to fetch classrooms by school'
    try {
      const parsed = JSON.parse(text)
      msg = parsed?.error || msg
    } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
    return items
  } catch (e) {
    console.error('classrooms/by-school parse error. Raw response:', text)
    return []
  }
}

export async function updateClassroom(id: string, updates: any) {
  // Use server API (service role) to handle teacher assignment and avoid RLS recursion
  const res = await fetch('/api/classrooms/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to update classroom')
  }
}

export async function deleteClassroom(id: string) {
  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getClassroomsByTeacher(teacherId: string) {
  // Teacher is linked via users.classroom_id in the new schema
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('classroom_id')
    .eq('id', teacherId)
    .single()

  if (userErr) throw userErr
  const u = (user as unknown) as { classroom_id: string | null }
  if (!u?.classroom_id) return []

  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', u.classroom_id)

  if (error) throw error
  return data
}


// Quiz operations
export async function createQuiz(quizData: TablesInsert<'quizzes'>) {
  const { data, error } = await supabase
    .from('quizzes')
    .insert(quizData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getQuizzesByLevel(level: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('level', level)
    .eq('is_published', true)
    .is('owner_id', null)
    .is('classroom_id', null)

  if (error) throw error
  return data
}

export async function getQuizzesByTeacher(teacherId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      classroom:classrooms(id, name, grade)
    `)
    .eq('owner_id', teacherId)

  if (error) throw error
  return data
}

export async function getQuizzesByClassroom(classroomId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('is_published', true)

  if (error) throw error
  return data
}

export async function getQuizWithItems(quizId: string) {
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single()

  if (quizError) throw quizError

  const { data: items, error: itemsError } = await supabase
    .from('quiz_items')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order_index')

  if (itemsError) throw itemsError

  return { 
    ...quiz as any, 
    items: items || [] 
  }
}

// Quiz item operations
export async function createQuizItem(itemData: TablesInsert<'quiz_items'>) {
  const { data, error } = await supabase
    .from('quiz_items')
    .insert(itemData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuizItem(id: string, updates: any) {
  const { data, error } = await (supabase as any)
    .from('quiz_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuizItem(id: string) {
  const { error } = await supabase
    .from('quiz_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Submission operations
export async function createSubmission(submissionData: TablesInsert<'submissions'>) {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submissionData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSubmissionsByParent(parentId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      quiz:quizzes(id, title, description, level)
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getParentStats(parentId: string) {
  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`*`)
      .eq('parent_id', parentId)

    if (error) throw error

    const submissionsData = submissions as Database['public']['Tables']['submissions']['Row'][] | null

    const totalQuizzesTaken = submissionsData?.length || 0
    const averageScore = totalQuizzesTaken > 0 
      ? submissionsData!.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalQuizzesTaken
      : 0

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissionsData?.filter(sub => 
      new Date(sub.created_at!) > weekAgo
    ) || []

    const perfectScores = submissionsData?.filter(sub => sub.score === sub.total_questions).length || 0
    
    const bestScore = totalQuizzesTaken > 0 
      ? Math.max(...submissionsData!.map(sub => (sub.score / sub.total_questions) * 100))
      : 0

    return {
      totalQuizzesTaken,
      averageScore: Math.round(averageScore),
      thisWeekQuizzes: thisWeekSubmissions.length,
      perfectScores,
      bestScore: Math.round(bestScore)
    }
  } catch (error) {
    console.error('Error fetching parent stats:', error)
    return {
      totalQuizzesTaken: 0,
      averageScore: 0,
      thisWeekQuizzes: 0,
      perfectScores: 0,
      bestScore: 0
    }
  }
}


// Additional statistics functions for real-time dashboard data
export async function getSchoolStatistics(schoolId: string) {
  try {
    const res = await fetch('/api/stats/school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to fetch school statistics')
    }
    return await res.json()
  } catch (error) {
    console.error('Error fetching school statistics:', error)
    throw error
  }
}

export async function getRecentActivity(schoolId: string, limit = 10) {
  try {
    const res = await fetch('/api/activity/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, limit }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to fetch recent activity')
    }
    const { items } = await res.json()
    return items || []
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

export async function getQuizEngagementStats(schoolId: string) {
  try {
    // Call server API to bypass RLS and heavy joins
    const res = await fetch('/api/stats/quiz-engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to fetch engagement stats')
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Error fetching quiz engagement stats:', error)
    return {
      totalSubmissions: 0,
      averageScore: 0,
      thisWeekSubmissions: 0,
      perfectScores: 0
    }
  }
}



export async function getTeacherEngagementStats(teacherId: string) {
  try {
    const [quizzes, submissions] = await Promise.all([
      getQuizzesByTeacher(teacherId),
      supabase
        .from('submissions')
        .select(`
          *,
          quiz:quizzes!inner(owner_id)
        `)
        .eq('quiz.owner_id', teacherId)
    ])

    // Type the submissions data properly
    const submissionsData = submissions.data as Database['public']['Tables']['submissions']['Row'][] | null

    // Type the quizzes data properly
    const quizzesData = quizzes as (Database['public']['Tables']['quizzes']['Row'] & {
      classroom: { id: string; name: string; grade: string } | null
    })[] | null

    const totalQuizzes = quizzesData?.length || 0
    const publishedQuizzes = quizzesData?.filter(q => q.is_published).length || 0
    const totalSubmissions = submissionsData?.length || 0
    
    // This week's activity
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissionsData?.filter(sub => 
      new Date(sub.created_at!) > weekAgo
    ).length || 0

    return {
      totalQuizzes,
      publishedQuizzes,
      draftQuizzes: totalQuizzes - publishedQuizzes,
      totalSubmissions,
      thisWeekSubmissions
    }
  } catch (error) {
    console.error('Error fetching teacher engagement stats:', error)
    return {
      totalQuizzes: 0,
      publishedQuizzes: 0,
      draftQuizzes: 0,
      totalSubmissions: 0,
      thisWeekSubmissions: 0
    }
  }
}

export async function getSubmissionsByQuiz(quizId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      student:users(id, full_name)
    `)
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Invitation link operations
export async function createInvitationLink(linkData: TablesInsert<'invitation_links'>) {
  const res = await fetch('/api/invitations/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linkData),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to create invitation link')
  }
  // No representation returned; caller should refresh lists if needed
  return { } as unknown as TablesRow<'invitation_links'>
}

export async function getInvitationLinkByToken(token: string): Promise<TablesRow<'invitation_links'>> {
  const { data, error } = await supabase
    .from('invitation_links')
    .select(`
      *,
      school:schools(id, name),
      classroom:classrooms(id, name, grade)
    `)
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('used_at', null)
    .single()

  if (error) throw error
  return data as TablesRow<'invitation_links'>
}

export async function markInvitationLinkAsUsed(id: string): Promise<TablesRow<'invitation_links'>> {
  const { data, error } = await (supabase as any)
    .from('invitation_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as TablesRow<'invitation_links'>
}

// Update user profile
export async function updateUser(id: string, updates: any): Promise<TablesRow<'users'>> {
  const { data, error } = await (supabase as any)
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as TablesRow<'users'>
}

// Get available invitation links for a school
export async function getInvitationLinksBySchool(schoolId: string) {
  const res = await fetch('/api/invitations/by-school', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = 'Failed to fetch invitation links by school'
    try {
      const parsed = JSON.parse(text)
      msg = parsed?.error || msg
    } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
    return items
  } catch (e) {
    console.error('invitations/by-school parse error. Raw response:', text)
    return []
  }
}