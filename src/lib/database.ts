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

export async function getUsersBySchoolLegacy(schoolId: string) {
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
    } catch (e) {
      // ignore parse error, use default msg
    }
    throw new Error(msg)
  }
  const { users } = await res.json()
  return users
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
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/teacher/classrooms', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to get classrooms')
  }

  const { classrooms } = await res.json()
  return classrooms
}


// Quiz operations
export async function createQuiz(quizData: TablesInsert<'quizzes'>) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/quizzes/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quizData),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to create quiz')
  }

  const { quiz } = await res.json()
  return quiz
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
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/teacher/quizzes', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to get quizzes')
  }

  const { quizzes } = await res.json()
  return quizzes
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
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/quiz-items/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to create quiz item')
  }

  const { quizItem } = await res.json()
  return quizItem
}

export async function publishQuiz(quizId: string, isPublished: boolean) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/quizzes/publish', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quizId, isPublished }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to publish quiz')
  }

  const { quiz } = await res.json()
  return quiz
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

export async function getSubmissionsByQuiz(quizId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      student:users!parent_id(id, full_name)
    `)
    .eq('quiz_id', quizId)
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
export async function getUsersBySchool(schoolId: string) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/teacher/students', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to get students')
  }

  const { students } = await res.json()
  return students
}

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
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/teacher/engagement', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to get engagement stats')
  }

  const { stats } = await res.json()
  return stats
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
  const res = await fetch('/api/invitations/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Invalid invitation token')
  }
  
  const { invitation } = await res.json()
  return invitation as TablesRow<'invitation_links'>
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
  const { data, error } = await supabase
    .from('invitation_links')
    .select(`
      *,
      classroom:classrooms(id, name, grade),
      creator:users!invitation_links_created_by_fkey(id, full_name)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getInvitationLinksByClassroom(classroomId: string) {
  const { data, error } = await supabase
    .from('invitation_links')
    .select(`
      *,
      classroom:classrooms(id, name, grade)
    `)
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function ensureParentInvitationLink(classroomId: string, schoolId: string) {
  // Check if an active parent invitation already exists for this classroom
  const { data: existingInvitation } = await supabase
    .from('invitation_links')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('intended_role', 'PARENT')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvitation) {
    return existingInvitation
  }

  // Create a new invitation link if none exists
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1) // Valid for 1 year

  const { data, error } = await supabase
    .from('invitation_links')
    .insert({
      token: crypto.randomUUID(),
      school_id: schoolId,
      classroom_id: classroomId,
      intended_role: 'PARENT' as const,
      expires_at: expiresAt.toISOString(),
    } as any)
    .select()
    .single()

  if (error) throw error
  return data
}