import { supabase } from './supabase'

/**
 * Get students (parents) for teacher's classroom
 */
export async function getTeacherStudents(teacherId: string) {
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

/**
 * Get submissions for teacher's quizzes
 */
export async function getSubmissionsByTeacher(teacherId: string) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) {
    throw new Error('No active session')
  }

  const res = await fetch('/api/teacher/submissions', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || 'Failed to get submissions')
  }

  const { submissions } = await res.json()
  return submissions
}
