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
