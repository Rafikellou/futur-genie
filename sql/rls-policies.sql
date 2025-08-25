-- Enable Row Level Security on all tables (safe to run multiple times)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view their own school" ON schools;
DROP POLICY IF EXISTS "Directors can manage their school" ON schools;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Directors can view users in their school" ON users;
DROP POLICY IF EXISTS "Directors can manage users in their school" ON users;
DROP POLICY IF EXISTS "Teachers can view students in their classrooms" ON users;
DROP POLICY IF EXISTS "Users can view classrooms in their school" ON classrooms;
DROP POLICY IF EXISTS "Directors can manage classrooms in their school" ON classrooms;
DROP POLICY IF EXISTS "Teachers can view their assigned classrooms" ON classrooms;
DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "Parents can view their children" ON students;
DROP POLICY IF EXISTS "Parents can manage their children" ON students;
DROP POLICY IF EXISTS "Teachers can view students in their classrooms" ON students;
DROP POLICY IF EXISTS "Directors can view students in their school" ON students;
DROP POLICY IF EXISTS "Everyone can view published self-service quizzes" ON quizzes;
DROP POLICY IF EXISTS "Students can view quizzes assigned to their classroom" ON quizzes;
DROP POLICY IF EXISTS "Teachers can manage their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can view quizzes for their classrooms" ON quizzes;
DROP POLICY IF EXISTS "Users can view quiz items for accessible quizzes" ON quiz_items;
DROP POLICY IF EXISTS "Teachers can manage quiz items for their quizzes" ON quiz_items;
DROP POLICY IF EXISTS "Students can view their own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can create their own submissions" ON submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their classroom quizzes" ON submissions;
DROP POLICY IF EXISTS "Parents can view their children's submissions" ON submissions;
DROP POLICY IF EXISTS "Directors can manage invitation links for their school" ON invitation_links;
DROP POLICY IF EXISTS "Anyone can view valid invitation links" ON invitation_links;

-- Get current user's role helper function to avoid recursive queries
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Get current user's school_id helper function to avoid recursive queries
CREATE OR REPLACE FUNCTION auth.user_school()
RETURNS uuid AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

--
-- SCHOOLS POLICIES
--

-- DIRECTORS: Can view and manage their own school
CREATE POLICY "Directors can manage schools" ON schools
    FOR ALL USING (auth.user_role() = 'DIRECTOR' AND id = auth.user_school());

-- TEACHERS: Can view their school
CREATE POLICY "Teachers can view school" ON schools
    FOR SELECT USING (auth.user_role() = 'TEACHER' AND id = auth.user_school());

-- PARENTS: Can view their school
CREATE POLICY "Parents can view school" ON schools
    FOR SELECT USING (auth.user_role() = 'PARENT' AND id = auth.user_school());

-- STUDENTS: Can view their school
CREATE POLICY "Students can view school" ON schools
    FOR SELECT USING (auth.user_role() = 'STUDENT' AND id = auth.user_school());

--
-- USERS POLICIES
--

-- ALL USERS: Can view and update their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- DIRECTORS: Can view and manage users in their school
CREATE POLICY "Directors can view school users" ON users
    FOR SELECT USING (
        auth.user_role() = 'DIRECTOR' AND 
        school_id = auth.user_school() AND 
        school_id IS NOT NULL
    );

CREATE POLICY "Directors can manage school users" ON users
    FOR ALL USING (
        auth.user_role() = 'DIRECTOR' AND 
        school_id = auth.user_school() AND 
        school_id IS NOT NULL
    );

-- TEACHERS: Can view students in their classrooms
CREATE POLICY "Teachers can view classroom students" ON users
    FOR SELECT USING (
        auth.user_role() = 'TEACHER' AND 
        role = 'STUDENT' AND 
        id IN (
            SELECT s.id FROM students s
            JOIN classrooms c ON s.classroom_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

-- PARENTS: Can view their children's profiles
CREATE POLICY "Parents can view children profiles" ON users
    FOR SELECT USING (
        auth.user_role() = 'PARENT' AND 
        id IN (SELECT id FROM students WHERE parent_id = auth.uid())
    );

--
-- CLASSROOMS POLICIES
--

-- DIRECTORS: Can manage all classrooms in their school
CREATE POLICY "Directors can manage classrooms" ON classrooms
    FOR ALL USING (
        auth.user_role() = 'DIRECTOR' AND 
        school_id = auth.user_school()
    );

-- TEACHERS: Can view classrooms they teach and others in their school
CREATE POLICY "Teachers can view all school classrooms" ON classrooms
    FOR SELECT USING (
        auth.user_role() = 'TEACHER' AND 
        school_id = auth.user_school()
    );

CREATE POLICY "Teachers can update their classrooms" ON classrooms
    FOR UPDATE USING (
        auth.user_role() = 'TEACHER' AND 
        teacher_id = auth.uid()
    );

-- STUDENTS: Can view only their own classroom
CREATE POLICY "Students can view their classroom" ON classrooms
    FOR SELECT USING (
        auth.user_role() = 'STUDENT' AND 
        id IN (SELECT classroom_id FROM students WHERE id = auth.uid())
    );

-- PARENTS: Can view only their children's classrooms
CREATE POLICY "Parents can view children classrooms" ON classrooms
    FOR SELECT USING (
        auth.user_role() = 'PARENT' AND 
        id IN (
            SELECT classroom_id FROM students 
            WHERE parent_id = auth.uid() AND classroom_id IS NOT NULL
        )
    );

--
-- STUDENTS POLICIES
--

-- STUDENTS: Can view their own record
CREATE POLICY "Students can view own record" ON students
    FOR SELECT USING (id = auth.uid());

-- PARENTS: Can view and manage their children
CREATE POLICY "Parents can view children" ON students
    FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Parents can manage children" ON students
    FOR UPDATE USING (parent_id = auth.uid());

-- TEACHERS: Can view students in their classrooms
CREATE POLICY "Teachers can view classroom students" ON students
    FOR SELECT USING (
        auth.user_role() = 'TEACHER' AND 
        classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
    );

-- DIRECTORS: Can view all students in their school
CREATE POLICY "Directors can view school students" ON students
    FOR SELECT USING (
        auth.user_role() = 'DIRECTOR' AND 
        classroom_id IN (
            SELECT id FROM classrooms WHERE school_id = auth.user_school()
        )
    );

--
-- QUIZZES POLICIES
--

-- EVERYONE: Can view published self-service quizzes
CREATE POLICY "Everyone can view published self-service quizzes" ON quizzes
    FOR SELECT USING (owner_id IS NULL AND classroom_id IS NULL AND is_published = true);

-- STUDENTS: Can view quizzes assigned to their classroom
CREATE POLICY "Students can view classroom quizzes" ON quizzes
    FOR SELECT USING (
        auth.user_role() = 'STUDENT' AND
        classroom_id IN (SELECT classroom_id FROM students WHERE id = auth.uid()) AND 
        is_published = true
    );

-- TEACHERS: Can manage their own quizzes and view quizzes for their classrooms
CREATE POLICY "Teachers can manage own quizzes" ON quizzes
    FOR ALL USING (
        auth.user_role() = 'TEACHER' AND 
        owner_id = auth.uid()
    );

CREATE POLICY "Teachers can view classroom quizzes" ON quizzes
    FOR SELECT USING (
        auth.user_role() = 'TEACHER' AND 
        classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
    );

-- DIRECTORS: Can view all quizzes in their school
CREATE POLICY "Directors can view school quizzes" ON quizzes
    FOR SELECT USING (
        auth.user_role() = 'DIRECTOR' AND 
        (owner_id IN (SELECT id FROM users WHERE school_id = auth.user_school()) OR
         classroom_id IN (SELECT id FROM classrooms WHERE school_id = auth.user_school()))
    );

--
-- QUIZ ITEMS POLICIES
--

-- ALL USERS: Can view quiz items for quizzes they can access
CREATE POLICY "Users can view accessible quiz items" ON quiz_items
    FOR SELECT USING (
        quiz_id IN (
            SELECT id FROM quizzes WHERE (
                -- Self-service quizzes for everyone
                (owner_id IS NULL AND classroom_id IS NULL AND is_published = true) OR
                
                -- Role-specific access
                CASE auth.user_role()
                    -- Students: their classroom's published quizzes
                    WHEN 'STUDENT' THEN 
                        (classroom_id IN (SELECT classroom_id FROM students WHERE id = auth.uid()) AND is_published = true)
                    
                    -- Teachers: their own quizzes or classroom quizzes
                    WHEN 'TEACHER' THEN 
                        (owner_id = auth.uid() OR 
                         classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid()))
                    
                    -- Directors: all school quizzes
                    WHEN 'DIRECTOR' THEN 
                        (owner_id IN (SELECT id FROM users WHERE school_id = auth.user_school()) OR
                         classroom_id IN (SELECT id FROM classrooms WHERE school_id = auth.user_school()))
                    
                    -- Parents: their children's classroom quizzes
                    WHEN 'PARENT' THEN 
                        (classroom_id IN (
                            SELECT classroom_id FROM students 
                            WHERE parent_id = auth.uid() AND classroom_id IS NOT NULL
                        ) AND is_published = true)
                    
                    ELSE false
                END
            )
        )
    );

-- TEACHERS: Can manage quiz items for their quizzes
CREATE POLICY "Teachers can manage quiz items" ON quiz_items
    FOR ALL USING (
        auth.user_role() = 'TEACHER' AND 
        quiz_id IN (SELECT id FROM quizzes WHERE owner_id = auth.uid())
    );

--
-- SUBMISSIONS POLICIES
--

-- STUDENTS: Can view and create their own submissions
CREATE POLICY "Students can view own submissions" ON submissions
    FOR SELECT USING (auth.user_role() = 'STUDENT' AND student_id = auth.uid());

CREATE POLICY "Students can create submissions" ON submissions
    FOR INSERT WITH CHECK (auth.user_role() = 'STUDENT' AND student_id = auth.uid());

-- TEACHERS: Can view submissions for quizzes in their classrooms
CREATE POLICY "Teachers can view classroom submissions" ON submissions
    FOR SELECT USING (
        auth.user_role() = 'TEACHER' AND 
        quiz_id IN (
            SELECT id FROM quizzes 
            WHERE classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
        )
    );

-- PARENTS: Can view their children's submissions
CREATE POLICY "Parents can view children submissions" ON submissions
    FOR SELECT USING (
        auth.user_role() = 'PARENT' AND 
        student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
    );

-- DIRECTORS: Can view all submissions in their school
CREATE POLICY "Directors can view school submissions" ON submissions
    FOR SELECT USING (
        auth.user_role() = 'DIRECTOR' AND 
        quiz_id IN (
            SELECT id FROM quizzes WHERE 
            (owner_id IN (SELECT id FROM users WHERE school_id = auth.user_school()) OR
             classroom_id IN (SELECT id FROM classrooms WHERE school_id = auth.user_school()))
        )
    );

--
-- INVITATION LINKS POLICIES
--

-- DIRECTORS: Can manage invitation links for their school
CREATE POLICY "Directors can manage invitation links" ON invitation_links
    FOR ALL USING (
        auth.user_role() = 'DIRECTOR' AND 
        school_id = auth.user_school()
    );

-- EVERYONE: Can view valid (unexpired, unused) invitation links
CREATE POLICY "Anyone can view valid invitation links" ON invitation_links
    FOR SELECT USING (expires_at > now() AND used_at IS NULL);