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

-- Schools policies
-- Simplified to avoid recursion - users can view schools they belong to
CREATE POLICY "Users can view their own school" ON schools
    FOR SELECT USING (
        id IN (
            SELECT school_id FROM users WHERE id = auth.uid() AND school_id IS NOT NULL
        )
    );

-- Directors can manage their school (simplified to avoid recursion)
CREATE POLICY "Directors can manage their school" ON schools
    FOR ALL USING (
        id IN (
            SELECT school_id FROM users 
            WHERE id = auth.uid() AND role = 'DIRECTOR' AND school_id IS NOT NULL
        )
    );

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Directors can view users in their school (simplified to avoid recursion)
CREATE POLICY "Directors can view users in their school" ON users
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM users 
            WHERE id = auth.uid() AND role = 'DIRECTOR' AND school_id IS NOT NULL
        ) AND school_id IS NOT NULL
    );

-- Directors can manage users in their school (simplified to avoid recursion)
CREATE POLICY "Directors can manage users in their school" ON users
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM users 
            WHERE id = auth.uid() AND role = 'DIRECTOR' AND school_id IS NOT NULL
        ) AND school_id IS NOT NULL
    );

CREATE POLICY "Teachers can view students in their classrooms" ON users
    FOR SELECT USING (
        role = 'STUDENT' AND id IN (
            SELECT s.id FROM students s
            JOIN classrooms c ON s.classroom_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

-- Classrooms policies
-- Simplified to avoid recursion
CREATE POLICY "Users can view classrooms in their school" ON classrooms
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM users WHERE id = auth.uid() AND school_id IS NOT NULL
        )
    );

CREATE POLICY "Directors can manage classrooms in their school" ON classrooms
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM users 
            WHERE id = auth.uid() AND role = 'DIRECTOR' AND school_id IS NOT NULL
        )
    );

CREATE POLICY "Teachers can view their assigned classrooms" ON classrooms
    FOR SELECT USING (teacher_id = auth.uid());

-- Students policies
CREATE POLICY "Students can view their own record" ON students
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Parents can view their children" ON students
    FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Parents can manage their children" ON students
    FOR ALL USING (parent_id = auth.uid());

CREATE POLICY "Teachers can view students in their classrooms" ON students
    FOR SELECT USING (
        classroom_id IN (
            SELECT id FROM classrooms WHERE teacher_id = auth.uid()
        )
    );

-- Simplified to avoid recursion
CREATE POLICY "Directors can view students in their school" ON students
    FOR SELECT USING (
        classroom_id IN (
            SELECT id FROM classrooms 
            WHERE school_id IN (
                SELECT school_id FROM users 
                WHERE id = auth.uid() AND role = 'DIRECTOR' AND school_id IS NOT NULL
            )
        )
    );

-- Quizzes policies
CREATE POLICY "Everyone can view published self-service quizzes" ON quizzes
    FOR SELECT USING (
        owner_id IS NULL AND classroom_id IS NULL AND is_published = true
    );

CREATE POLICY "Students can view quizzes assigned to their classroom" ON quizzes
    FOR SELECT USING (
        classroom_id IN (
            SELECT classroom_id FROM students WHERE id = auth.uid()
        ) AND is_published = true
    );

CREATE POLICY "Teachers can manage their own quizzes" ON quizzes
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Teachers can view quizzes for their classrooms" ON quizzes
    FOR SELECT USING (
        classroom_id IN (
            SELECT id FROM classrooms WHERE teacher_id = auth.uid()
        )
    );

-- Quiz items policies
CREATE POLICY "Users can view quiz items for accessible quizzes" ON quiz_items
    FOR SELECT USING (
        quiz_id IN (
            SELECT id FROM quizzes
            WHERE (
                -- Self-service quizzes
                (owner_id IS NULL AND classroom_id IS NULL AND is_published = true)
                OR
                -- Student's classroom quizzes
                (classroom_id IN (
                    SELECT classroom_id FROM students WHERE id = auth.uid()
                ) AND is_published = true)
                OR
                -- Teacher's own quizzes
                (owner_id = auth.uid())
                OR
                -- Teacher's classroom quizzes
                (classroom_id IN (
                    SELECT id FROM classrooms WHERE teacher_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "Teachers can manage quiz items for their quizzes" ON quiz_items
    FOR ALL USING (
        quiz_id IN (
            SELECT id FROM quizzes WHERE owner_id = auth.uid()
        )
    );

-- Submissions policies
CREATE POLICY "Students can view their own submissions" ON submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create their own submissions" ON submissions
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions for their classroom quizzes" ON submissions
    FOR SELECT USING (
        quiz_id IN (
            SELECT id FROM quizzes 
            WHERE classroom_id IN (
                SELECT id FROM classrooms WHERE teacher_id = auth.uid()
            )
        )
    );

CREATE POLICY "Parents can view their children's submissions" ON submissions
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE parent_id = auth.uid()
        )
    );

-- Invitation links policies
CREATE POLICY "Directors can manage invitation links for their school" ON invitation_links
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM users 
            WHERE id = auth.uid() AND role = 'DIRECTOR' AND school_id IS NOT NULL
        )
    );

CREATE POLICY "Anyone can view valid invitation links" ON invitation_links
    FOR SELECT USING (
        expires_at > now() AND used_at IS NULL
    );