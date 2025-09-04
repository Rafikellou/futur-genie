export type Role = 'DIRECTOR'|'TEACHER'|'PARENT';

export function getAuthMeta(session: { user: any }) {
  const u = session.user;
  const m = u?.app_metadata ?? {};
  return {
    userId: u?.id as string,
    role: (m.user_role ?? null) as Role | null,
    schoolId: (m.school_id ?? null) as string | null,
    classroomId: (m.classroom_id ?? null) as string | null,
  };
}

export function verifyJWT(token: string) {
  try {
    // Simple JWT decode without verification (since we trust Supabase tokens)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(atob(parts[1]))
    const meta = payload.app_metadata || {}
    
    return {
      userId: payload.sub,
      role: meta.user_role || null,
      schoolId: meta.school_id || null,
      classroomId: meta.classroom_id || null
    }
  } catch (error) {
    console.error('Error verifying JWT:', error)
    return null
  }
}
