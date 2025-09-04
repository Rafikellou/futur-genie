// Mock Supabase client first to avoid hoisting issues
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
} as any;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

import { createClassroom, createInvitationLink, createSchool, createUser } from '../lib/database';

describe('Onboarding Flow Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    );
  });

  it('should successfully run the full onboarding and creation flow', async () => {
    // 1. Create Director and School
    const school = { id: 'school-1', name: 'Test School' };
    const director = {
      id: 'director-1',
      role: 'DIRECTOR' as const,
      school_id: school.id,
      email: 'director@test.com',
      full_name: 'Director Name',
    };

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: school, error: null }) // createSchool
      .mockResolvedValueOnce({ data: director, error: null }); // createUser (director)

    const createdSchool = await createSchool('Test School');
    const createdDirector = await createUser(director);

    expect(createdSchool.id).toEqual(school.id);
    expect(createdDirector.id).toEqual(director.id);
    expect(createdDirector.role).toEqual('DIRECTOR');

    // 2. Create Classroom
    await createClassroom({ name: 'Test Class', school_id: school.id, grade: 'CP' });
    expect(global.fetch).toHaveBeenCalledWith('/api/classrooms/create', expect.any(Object));

    const classroomId = 'classroom-1'; // Assume classroom created with this ID

    // 3. Create Teacher via Invitation
    const teacher = { id: 'teacher-1', role: 'TEACHER' as const, school_id: school.id, classroom_id: classroomId, email: 'teacher@test.com', full_name: 'Teacher Name' };
    mockSupabaseClient.single.mockResolvedValueOnce({ data: teacher, error: null }); // createUser (teacher)

    await createInvitationLink({ classroom_id: classroomId, school_id: school.id, created_by: director.id, token: 'teacher-token', expires_at: new Date().toISOString() });
    const createdTeacher = await createUser(teacher);

    expect(global.fetch).toHaveBeenCalledWith('/api/invitations/create', expect.any(Object));
    expect(createdTeacher.id).toEqual(teacher.id);
    expect(createdTeacher.classroom_id).toEqual(classroomId);

    // 4. Create Parent via Invitation
    const parent = { id: 'parent-1', role: 'PARENT' as const, school_id: school.id, classroom_id: classroomId, email: 'parent@test.com', full_name: 'Parent Name' };
    mockSupabaseClient.single.mockResolvedValueOnce({ data: parent, error: null }); // createUser (parent)

    await createInvitationLink({ classroom_id: classroomId, school_id: school.id, created_by: director.id, token: 'parent-token', expires_at: new Date().toISOString() });
    const createdParent = await createUser(parent);

    expect(global.fetch).toHaveBeenCalledWith('/api/invitations/create', expect.any(Object));
    expect(createdParent.id).toEqual(parent.id);
    expect(createdParent.role).toEqual('PARENT');
  });
});
