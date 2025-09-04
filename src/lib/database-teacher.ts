import { supabase } from './supabase'

/**
 * Get students (parents) for teacher's classroom
 */
export async function getTeacherStudents() {
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
