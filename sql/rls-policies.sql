-- DO NOT EDIT IN CODE: source of truth for RLS
-- ============================================================================
-- RLS POLICIES – MVP (sans table "children")
-- ============================================================================

-- Helpers JWT
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.jwt_claim(claim TEXT) RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> claim, ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> claim), '')
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid AS $$
  SELECT app.jwt_claim('sub')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_role() RETURNS user_role AS $$
  SELECT app.jwt_claim('user_role')::user_role;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_school_id() RETURNS uuid AS $$
  SELECT app.jwt_claim('school_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_user_classroom_id() RETURNS uuid AS $$
  SELECT app.jwt_claim('classroom_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.is_role(r user_role) RETURNS boolean AS $$
  SELECT app.current_user_role() = r;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.same_school(sid uuid) RETURNS boolean AS $$
  SELECT sid = app.current_user_school_id();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.same_classroom(cid uuid) RETURNS boolean AS $$
  SELECT cid = app.current_user_classroom_id();
$$ LANGUAGE sql STABLE;

-- Activer RLS
ALTER TABLE public.schools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_links ENABLE ROW LEVEL SECURITY;

-- ========= SCHOOLS =========
DROP POLICY IF EXISTS p_schools_director_select ON public.schools;
DROP POLICY IF EXISTS p_schools_director_update ON public.schools;
DROP POLICY IF EXISTS p_schools_director_insert ON public.schools;
DROP POLICY IF EXISTS p_schools_director_delete ON public.schools;
DROP POLICY IF EXISTS p_schools_me_select        ON public.schools;

CREATE POLICY p_schools_director_select ON public.schools
  FOR SELECT USING (app.is_role('DIRECTOR') AND id = app.current_user_school_id());

CREATE POLICY p_schools_director_update ON public.schools
  FOR UPDATE USING (app.is_role('DIRECTOR') AND id = app.current_user_school_id())
  WITH CHECK (app.is_role('DIRECTOR') AND id = app.current_user_school_id());

CREATE POLICY p_schools_director_insert ON public.schools
  FOR INSERT WITH CHECK (app.is_role('DIRECTOR') AND id = app.current_user_school_id());

CREATE POLICY p_schools_director_delete ON public.schools
  FOR DELETE USING (app.is_role('DIRECTOR') AND id = app.current_user_school_id());

CREATE POLICY p_schools_me_select ON public.schools
  FOR SELECT USING (id = app.current_user_school_id());

-- ========= USERS =========
DROP POLICY IF EXISTS p_users_self_select     ON public.users;
DROP POLICY IF EXISTS p_users_self_update     ON public.users;
DROP POLICY IF EXISTS p_users_director_select ON public.users;
DROP POLICY IF EXISTS p_users_director_update ON public.users;
DROP POLICY IF EXISTS p_users_director_delete ON public.users;

CREATE POLICY p_users_self_select ON public.users
  FOR SELECT USING (id = app.current_user_id());

CREATE POLICY p_users_self_update ON public.users
  FOR UPDATE USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());

CREATE POLICY p_users_director_select ON public.users
  FOR SELECT USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_users_director_update ON public.users
  FOR UPDATE USING (app.is_role('DIRECTOR') AND app.same_school(school_id))
  WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_users_director_delete ON public.users
  FOR DELETE USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

-- ========= CLASSROOMS =========
DROP POLICY IF EXISTS p_classrooms_director_select ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_director_update ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_director_insert ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_director_delete ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_teacher_select  ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_teacher_update  ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_parent_select   ON public.classrooms;

CREATE POLICY p_classrooms_director_select ON public.classrooms
  FOR SELECT USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_classrooms_director_update ON public.classrooms
  FOR UPDATE USING (app.is_role('DIRECTOR') AND app.same_school(school_id))
  WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_classrooms_director_insert ON public.classrooms
  FOR INSERT WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_classrooms_director_delete ON public.classrooms
  FOR DELETE USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_classrooms_teacher_select ON public.classrooms
  FOR SELECT USING (app.is_role('TEACHER') AND app.same_classroom(id));

CREATE POLICY p_classrooms_teacher_update ON public.classrooms
  FOR UPDATE USING (app.is_role('TEACHER') AND app.same_classroom(id))
  WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(id));

CREATE POLICY p_classrooms_parent_select ON public.classrooms
  FOR SELECT USING (app.is_role('PARENT') AND app.same_classroom(id));

-- ========= QUIZZES =========
DROP POLICY IF EXISTS p_quizzes_director_select ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_director_update ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_director_insert ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_director_delete ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_teacher_select  ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_teacher_update  ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_teacher_insert  ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_teacher_delete  ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_parent_select   ON public.quizzes;

CREATE POLICY p_quizzes_director_select ON public.quizzes
  FOR SELECT USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quizzes_director_update ON public.quizzes
  FOR UPDATE USING (app.is_role('DIRECTOR') AND app.same_school(school_id))
  WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quizzes_director_insert ON public.quizzes
  FOR INSERT WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quizzes_director_delete ON public.quizzes
  FOR DELETE USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quizzes_teacher_select ON public.quizzes
  FOR SELECT USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quizzes_teacher_update ON public.quizzes
  FOR UPDATE USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id))
  WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quizzes_teacher_insert ON public.quizzes
  FOR INSERT WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quizzes_teacher_delete ON public.quizzes
  FOR DELETE USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quizzes_parent_select ON public.quizzes
  FOR SELECT USING (app.is_role('PARENT') AND is_published = true AND app.same_classroom(classroom_id));

-- ========= QUIZ ITEMS =========
DROP POLICY IF EXISTS p_quiz_items_director_select ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_director_update ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_director_insert ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_director_delete ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_teacher_select  ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_teacher_update  ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_teacher_insert  ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_teacher_delete  ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_parent_select   ON public.quiz_items;

CREATE POLICY p_quiz_items_director_select ON public.quiz_items
  FOR SELECT USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quiz_items_director_update ON public.quiz_items
  FOR UPDATE USING (app.is_role('DIRECTOR') AND app.same_school(school_id))
  WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quiz_items_director_insert ON public.quiz_items
  FOR INSERT WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quiz_items_director_delete ON public.quiz_items
  FOR DELETE USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_quiz_items_teacher_select ON public.quiz_items
  FOR SELECT USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quiz_items_teacher_update ON public.quiz_items
  FOR UPDATE USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id))
  WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quiz_items_teacher_insert ON public.quiz_items
  FOR INSERT WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quiz_items_teacher_delete ON public.quiz_items
  FOR DELETE USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_quiz_items_parent_select ON public.quiz_items
  FOR SELECT USING (app.is_role('PARENT') AND app.same_classroom(classroom_id));

-- ========= SUBMISSIONS =========
DROP POLICY IF EXISTS p_submissions_director_select ON public.submissions;
DROP POLICY IF EXISTS p_submissions_teacher_select  ON public.submissions;
DROP POLICY IF EXISTS p_submissions_parent_select   ON public.submissions;
DROP POLICY IF EXISTS p_submissions_parent_insert   ON public.submissions;
DROP POLICY IF EXISTS p_submissions_parent_update   ON public.submissions;
DROP POLICY IF EXISTS p_submissions_parent_delete   ON public.submissions;

CREATE POLICY p_submissions_director_select ON public.submissions
  FOR SELECT USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_submissions_teacher_select ON public.submissions
  FOR SELECT USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_submissions_parent_select ON public.submissions
  FOR SELECT USING (app.is_role('PARENT') AND parent_id = app.current_user_id() AND app.same_classroom(classroom_id));

CREATE POLICY p_submissions_parent_insert ON public.submissions
  FOR INSERT WITH CHECK (
    app.is_role('PARENT') AND parent_id = app.current_user_id()
    AND app.same_classroom(classroom_id) AND app.same_school(school_id)
  );

CREATE POLICY p_submissions_parent_update ON public.submissions
  FOR UPDATE USING (app.is_role('PARENT') AND parent_id = app.current_user_id() AND app.same_classroom(classroom_id))
  WITH CHECK (
    app.is_role('PARENT') AND parent_id = app.current_user_id()
    AND app.same_classroom(classroom_id) AND app.same_school(school_id)
  );

CREATE POLICY p_submissions_parent_delete ON public.submissions
  FOR DELETE USING (app.is_role('PARENT') AND parent_id = app.current_user_id() AND app.same_classroom(classroom_id));

-- ========= INVITATION LINKS =========
DROP POLICY IF EXISTS p_invites_auth_select     ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_director_insert ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_director_update ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_director_delete ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_teacher_insert  ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_teacher_update  ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_teacher_delete  ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_public_select   ON public.invitation_links;

CREATE POLICY p_invites_auth_select ON public.invitation_links
  FOR SELECT USING (
    (app.is_role('DIRECTOR') AND app.same_school(school_id)) OR
    (app.is_role('TEACHER')  AND app.same_classroom(classroom_id))
  );

CREATE POLICY p_invites_director_insert ON public.invitation_links
  FOR INSERT WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_invites_director_update ON public.invitation_links
  FOR UPDATE USING (app.is_role('DIRECTOR') AND app.same_school(school_id))
  WITH CHECK (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_invites_director_delete ON public.invitation_links
  FOR DELETE USING (app.is_role('DIRECTOR') AND app.same_school(school_id));

CREATE POLICY p_invites_teacher_insert ON public.invitation_links
  FOR INSERT WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_invites_teacher_update ON public.invitation_links
  FOR UPDATE USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id))
  WITH CHECK (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_invites_teacher_delete ON public.invitation_links
  FOR DELETE USING (app.is_role('TEACHER') AND app.same_classroom(classroom_id));

CREATE POLICY p_invites_public_select ON public.invitation_links
  FOR SELECT USING (expires_at > now() AND used_at IS NULL);
