import { supabase } from './supabase'
import { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type TablesInsert<T extends keyof Tables> = Tables[T]['Insert']
type TablesUpdate<T extends keyof Tables> = Tables[T]['Update']
type TablesRow<T extends keyof Tables> = Tables[T]['Row']

// User operations
export async function createUser(userData: TablesInsert<'users'>) {
  const { data, error } = await supabase
    .from('users')
    .insert(userData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getUsersBySchool(schoolId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('school_id', schoolId)

  if (error) throw error
  return data
}

// School operations
export async function createSchool(name: string) {
  const { data, error } = await supabase
    .from('schools')
    .insert({ name } as any)
    .select()
    .single()

  if (error) throw error
  return data
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
export async function createClassroom(classroomData: TablesInsert<'classrooms'>) {
  const { data, error } = await supabase
    .from('classrooms')
    .insert(classroomData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getClassroomsBySchool(schoolId: string) {
  const { data, error } = await supabase
    .from('classrooms')
    .select(`
      *,
      teacher:users(id, full_name, email)
    `)
    .eq('school_id', schoolId)

  if (error) throw error
  return data
}

export async function updateClassroom(id: string, updates: any) {
  const { data, error } = await (supabase as any)
    .from('classrooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClassroom(id: string) {
  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getClassroomsByTeacher(teacherId: string) {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('teacher_id', teacherId)

  if (error) throw error
  return data
}

// Student operations
export async function createStudent(studentData: TablesInsert<'students'>) {
  const { data, error } = await supabase
    .from('students')
    .insert(studentData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getStudentsByParent(parentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      user:users(id, full_name, email),
      classroom:classrooms(id, name, grade)
    `)
    .eq('parent_id', parentId)

  if (error) throw error
  return data
}

export async function getStudentsByClassroom(classroomId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      user:users(id, full_name, email)
    `)
    .eq('classroom_id', classroomId)

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

export async function getSubmissionsByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      quiz:quizzes(id, title, description, level)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Additional statistics functions for real-time dashboard data
export async function getSchoolStatistics(schoolId: string) {
  try {
    const [users, classrooms, quizzes] = await Promise.all([
      getUsersBySchool(schoolId),
      getClassroomsBySchool(schoolId),
      supabase
        .from('quizzes')
        .select(`
          *,
          classroom:classrooms!inner(school_id)
        `)
        .eq('classroom.school_id', schoolId)
    ])

    const teachers = (users as any[]).filter(user => user.role === 'TEACHER')
    const students = (users as any[]).filter(user => user.role === 'STUDENT')
    const parents = (users as any[]).filter(user => user.role === 'PARENT')

    return {
      totalUsers: users?.length || 0,
      totalTeachers: teachers.length,
      totalStudents: students.length,
      totalParents: parents.length,
      totalClasses: classrooms?.length || 0,
      totalQuizzes: quizzes.data?.length || 0,
      publishedQuizzes: quizzes.data?.filter(q => q.is_published).length || 0
    }
  } catch (error) {
    console.error('Error fetching school statistics:', error)
    throw error
  }
}

export async function getRecentActivity(schoolId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        student:users!inner(id, full_name),
        quiz:quizzes!inner(
          id, 
          title, 
          classroom:classrooms!inner(school_id)
        )
      `)
      .eq('quiz.classroom.school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

export async function getQuizEngagementStats(schoolId: string) {
  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        *,
        quiz:quizzes!inner(
          classroom:classrooms!inner(school_id)
        )
      `)
      .eq('quiz.classroom.school_id', schoolId)

    if (error) throw error

    const totalSubmissions = submissions?.length || 0
    const averageScore = totalSubmissions > 0 
      ? submissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalSubmissions
      : 0

    // This week's activity
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissions?.filter(sub => 
      new Date(sub.created_at) > weekAgo
    ) || []

    return {
      totalSubmissions,
      averageScore: Math.round(averageScore),
      thisWeekSubmissions: thisWeekSubmissions.length,
      perfectScores: submissions?.filter(sub => sub.score === sub.total_questions).length || 0
    }
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

export async function getStudentEngagementStats(studentId: string) {
  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`*`)
      .eq('student_id', studentId)

    if (error) throw error

    const totalQuizzesTaken = submissions?.length || 0
    const averageScore = totalQuizzesTaken > 0 
      ? submissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalQuizzesTaken
      : 0

    // This week's activity
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissions?.filter(sub => 
      new Date(sub.created_at) > weekAgo
    ) || []

    const perfectScores = submissions?.filter(sub => sub.score === sub.total_questions).length || 0
    
    // Get best score
    const bestScore = totalQuizzesTaken > 0 
      ? Math.max(...submissions.map(sub => (sub.score / sub.total_questions) * 100))
      : 0

    return {
      totalQuizzesTaken,
      averageScore: Math.round(averageScore),
      thisWeekQuizzes: thisWeekSubmissions.length,
      perfectScores,
      bestScore: Math.round(bestScore)
    }
  } catch (error) {
    console.error('Error fetching student engagement stats:', error)
    return {
      totalQuizzesTaken: 0,
      averageScore: 0,
      thisWeekQuizzes: 0,
      perfectScores: 0,
      bestScore: 0
    }
  }
}

export async function getParentChildrenStats(parentId: string) {
  try {
    // Get all children for this parent
    const { data: children, error: childrenError } = await supabase
      .from('students')
      .select(`
        id,
        user:users!inner(id, full_name)
      `)
      .eq('parent_id', parentId)

    if (childrenError) throw childrenError

    if (!children || children.length === 0) {
      return {
        totalChildren: 0,
        totalQuizzesTaken: 0,
        averageScore: 0,
        thisWeekActivity: 0,
        perfectScores: 0
      }
    }

    // Get submissions for all children
    const childrenIds = children.map(child => child.id)
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`*`)
      .in('student_id', childrenIds)

    if (submissionsError) throw submissionsError

    const totalQuizzesTaken = submissions?.length || 0
    const averageScore = totalQuizzesTaken > 0 
      ? submissions.reduce((sum, sub) => sum + (sub.score / sub.total_questions * 100), 0) / totalQuizzesTaken
      : 0

    // This week's activity
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissions?.filter(sub => 
      new Date(sub.created_at) > weekAgo
    ) || []

    const perfectScores = submissions?.filter(sub => sub.score === sub.total_questions).length || 0

    return {
      totalChildren: children.length,
      totalQuizzesTaken,
      averageScore: Math.round(averageScore),
      thisWeekActivity: thisWeekSubmissions.length,
      perfectScores
    }
  } catch (error) {
    console.error('Error fetching parent children stats:', error)
    return {
      totalChildren: 0,
      totalQuizzesTaken: 0,
      averageScore: 0,
      thisWeekActivity: 0,
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

    const totalQuizzes = quizzes?.length || 0
    const publishedQuizzes = quizzes?.filter(q => q.is_published).length || 0
    const totalSubmissions = submissions.data?.length || 0
    
    // This week's activity
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSubmissions = submissions.data?.filter(sub => 
      new Date(sub.created_at) > weekAgo
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
  const { data, error } = await supabase
    .from('invitation_links')
    .insert(linkData as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getInvitationLinkByToken(token: string) {
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
  return data
}

export async function markInvitationLinkAsUsed(id: string) {
  const { data, error } = await (supabase as any)
    .from('invitation_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Update user profile
export async function updateUser(id: string, updates: any) {
  const { data, error } = await (supabase as any)
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get available invitation links for a school
export async function getInvitationLinksBySchool(schoolId: string) {
  const { data, error } = await supabase
    .from('invitation_links')
    .select(`
      *,
      classroom:classrooms(id, name, grade),
      creator:users!created_by(id, full_name)
    `)
    .eq('school_id', schoolId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}