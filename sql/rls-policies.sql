-- ============================================================================
-- CLEANUP & SETUP
-- ============================================================================
-- Drop all existing policies to ensure a clean slate.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END;
$$;

-- Enable RLS on all relevant tables (idempotent).
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS (FROM JWT)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.jwt_claim(claim TEXT) RETURNS TEXT AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> claim, ''), NULL);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS UUID AS $$
  SELECT app.jwt_claim('sub')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_role() RETURNS user_role AS $$
  SELECT app.jwt_claim('user_role')::user_role;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_school_id() RETURNS UUID AS $$
  SELECT app.jwt_claim('school_id')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_classroom_id() RETURNS UUID AS $$
  SELECT app.jwt_claim('classroom_id')::UUID;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- USERS
-- ============================================================================
-- ALL: Can view and update their own profile.
CREATE POLICY p_users_self_access ON public.users FOR ALL
  USING (id = app.current_user_id());

-- DIRECTOR: Can view and manage all users within their school.
CREATE POLICY p_users_director_access ON public.users FOR ALL
  USING (app.current_user_role() = 'DIRECTOR' AND school_id = app.current_user_school_id());

-- TEACHER: Can view parents of children in their class.
CREATE POLICY p_users_teacher_select_parents ON public.users FOR SELECT
  USING (app.current_user_role() = 'TEACHER' AND id IN (
    SELECT parent_id FROM public.children WHERE classroom_id = app.current_user_classroom_id()
  ));

-- ============================================================================
-- SCHOOLS
-- ============================================================================
-- DIRECTOR: Can fully manage their own school.
CREATE POLICY p_schools_director_access ON public.schools FOR ALL
  USING (app.current_user_role() = 'DIRECTOR' AND id = app.current_user_school_id());

-- ALL: Authenticated users can view their own school.
CREATE POLICY p_schools_authenticated_select ON public.schools FOR SELECT
  USING (id = app.current_user_school_id());

-- ============================================================================
-- CLASSROOMS
-- ============================================================================
-- DIRECTOR: Can fully manage all classrooms in their school.
CREATE POLICY p_classrooms_director_access ON public.classrooms FOR ALL
  USING (app.current_user_role() = 'DIRECTOR' AND school_id = app.current_user_school_id());

-- TEACHER: Can fully manage their assigned classroom.
CREATE POLICY p_classrooms_teacher_access ON public.classrooms FOR ALL
  USING (app.current_user_role() = 'TEACHER' AND id = app.current_user_classroom_id());

-- PARENT: Can view the classroom of their children.
CREATE POLICY p_classrooms_parent_select ON public.classrooms FOR SELECT
  USING (app.current_user_role() = 'PARENT' AND id IN (
    SELECT classroom_id FROM public.children WHERE parent_id = app.current_user_id()
  ));

-- ============================================================================
-- CHILDREN
-- ============================================================================
-- DIRECTOR: Can view all children in their school.
CREATE POLICY p_children_director_select ON public.children FOR SELECT
  USING (app.current_user_role() = 'DIRECTOR' AND classroom_id IN (
    SELECT id FROM public.classrooms WHERE school_id = app.current_user_school_id()
  ));

-- TEACHER: Can manage children in their assigned classroom.
CREATE POLICY p_children_teacher_access ON public.children FOR ALL
  USING (app.current_user_role() = 'TEACHER' AND classroom_id = app.current_user_classroom_id());

-- PARENT: Can manage their own children.
CREATE POLICY p_children_parent_access ON public.children FOR ALL
  USING (app.current_user_role() = 'PARENT' AND parent_id = app.current_user_id());

-- ============================================================================
-- QUIZZES
-- ============================================================================
-- DIRECTOR: Can manage all quizzes in their school.
CREATE POLICY p_quizzes_director_access ON public.quizzes FOR ALL
  USING (app.current_user_role() = 'DIRECTOR' AND classroom_id IN (
    SELECT id FROM public.classrooms WHERE school_id = app.current_user_school_id()
  ));

-- TEACHER: Can manage quizzes for their classroom.
CREATE POLICY p_quizzes_teacher_access ON public.quizzes FOR ALL
  USING (app.current_user_role() = 'TEACHER' AND classroom_id = app.current_user_classroom_id());

-- PARENT: Can view published quizzes for their child's classroom.
CREATE POLICY p_quizzes_parent_select ON public.quizzes FOR SELECT
  USING (app.current_user_role() = 'PARENT' AND is_published = true AND classroom_id IN (
    SELECT classroom_id FROM public.children WHERE parent_id = app.current_user_id()
  ));

-- ============================================================================
-- QUIZ ITEMS
-- ============================================================================
-- ALL: Can access quiz items if they can access the parent quiz.
CREATE POLICY p_quiz_items_access ON public.quiz_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id));

-- ============================================================================
-- SUBMISSIONS
-- ============================================================================
-- DIRECTOR: Can view all submissions in their school.
CREATE POLICY p_submissions_director_select ON public.submissions FOR SELECT
  USING (app.current_user_role() = 'DIRECTOR' AND quiz_id IN (
    SELECT id FROM public.quizzes WHERE classroom_id IN (
      SELECT id FROM public.classrooms WHERE school_id = app.current_user_school_id()
    )
  ));

-- TEACHER: Can view all submissions for their classroom.
CREATE POLICY p_submissions_teacher_select ON public.submissions FOR SELECT
  USING (app.current_user_role() = 'TEACHER' AND quiz_id IN (
    SELECT id FROM public.quizzes WHERE classroom_id = app.current_user_classroom_id()
  ));

-- PARENT: Can create submissions for their child and view their own submissions.
CREATE POLICY p_submissions_parent_access ON public.submissions FOR ALL
  USING (app.current_user_role() = 'PARENT' AND parent_id = app.current_user_id())
  WITH CHECK (app.current_user_role() = 'PARENT' AND parent_id = app.current_user_id() AND child_id IN (
    SELECT id FROM public.children WHERE parent_id = app.current_user_id()
  ));

-- ============================================================================
-- INVITATION LINKS
-- ============================================================================
-- DIRECTOR/TEACHER: Can manage invitation links for their school/classroom.
CREATE POLICY p_invitations_auth_access ON public.invitation_links FOR ALL
  USING (
    (app.current_user_role() = 'DIRECTOR' AND school_id = app.current_user_school_id()) OR
    (app.current_user_role() = 'TEACHER' AND classroom_id = app.current_user_classroom_id())
  );

-- PUBLIC: Anyone with a valid link can view it.
CREATE POLICY p_invitations_public_select ON public.invitation_links FOR SELECT
  USING (expires_at > now() AND used_at IS NULL);
