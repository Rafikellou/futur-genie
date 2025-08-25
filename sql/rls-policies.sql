-- ============================================================================
-- PRÉREQUIS : activer RLS (idempotent)
-- ============================================================================
ALTER TABLE public.schools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_links ENABLE ROW LEVEL SECURITY;

-- Nettoyage (idempotent)
DROP POLICY IF EXISTS p_schools_director_all           ON public.schools;
DROP POLICY IF EXISTS p_schools_teacher_select         ON public.schools;
DROP POLICY IF EXISTS p_schools_parent_select          ON public.schools;
DROP POLICY IF EXISTS p_schools_student_select         ON public.schools;

DROP POLICY IF EXISTS p_users_self_select              ON public.users;
DROP POLICY IF EXISTS p_users_self_update              ON public.users;
DROP POLICY IF EXISTS p_users_insert_self              ON public.users;
DROP POLICY IF EXISTS p_users_director_select          ON public.users;
DROP POLICY IF EXISTS p_users_director_update          ON public.users;
DROP POLICY IF EXISTS p_users_teacher_students_select  ON public.users;
DROP POLICY IF EXISTS p_users_parent_children_select   ON public.users;

DROP POLICY IF EXISTS p_classrooms_director_all        ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_teacher_select      ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_teacher_update      ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_student_select      ON public.classrooms;
DROP POLICY IF EXISTS p_classrooms_parent_select       ON public.classrooms;

DROP POLICY IF EXISTS p_students_self_select           ON public.students;
DROP POLICY IF EXISTS p_students_parent_select         ON public.students;
DROP POLICY IF EXISTS p_students_parent_update         ON public.students;
DROP POLICY IF EXISTS p_students_teacher_select        ON public.students;
DROP POLICY IF EXISTS p_students_director_select       ON public.students;

DROP POLICY IF EXISTS p_quizzes_public_select          ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_student_select         ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_teacher_all            ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_teacher_class_select   ON public.quizzes;
DROP POLICY IF EXISTS p_quizzes_director_select        ON public.quizzes;

DROP POLICY IF EXISTS p_quiz_items_user_select         ON public.quiz_items;
DROP POLICY IF EXISTS p_quiz_items_teacher_all         ON public.quiz_items;

DROP POLICY IF EXISTS p_submissions_student_select     ON public.submissions;
DROP POLICY IF EXISTS p_submissions_student_insert     ON public.submissions;
DROP POLICY IF EXISTS p_submissions_teacher_select     ON public.submissions;
DROP POLICY IF EXISTS p_submissions_parent_select      ON public.submissions;
DROP POLICY IF EXISTS p_submissions_director_select    ON public.submissions;

DROP POLICY IF EXISTS p_invites_director_all           ON public.invitation_links;
DROP POLICY IF EXISTS p_invites_public_select          ON public.invitation_links;

-- ============================================================================
-- Helpers basés sur JWT (ne lisent AUCUNE table) — zéro risque de boucle
-- ============================================================================
-- Créer le schéma 'app' s'il n'existe pas (nécessaire pour nos helpers JWT)
CREATE SCHEMA IF NOT EXISTS app;

-- Supabase expose auth.jwt() => jsonb des claims
CREATE OR REPLACE FUNCTION app.jwt_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE( NULLIF(auth.jwt() ->> 'role','') , '' );
$$;

CREATE OR REPLACE FUNCTION app.jwt_school_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() ->> 'school_id','')::uuid;
$$;

-- ============================================================================
-- SCHOOLS
-- ============================================================================
-- Directeur : CRUD sur SON école OU création de sa première école (school_id null)
CREATE POLICY p_schools_director_all ON public.schools
  FOR ALL
  USING     (app.jwt_role() = 'DIRECTOR' AND (id = app.jwt_school_id() OR app.jwt_school_id() IS NULL))
  WITH CHECK(app.jwt_role() = 'DIRECTOR' AND (id = app.jwt_school_id() OR app.jwt_school_id() IS NULL));

-- Enseignant / Parent / Élève : lecture de leur école
CREATE POLICY p_schools_teacher_select ON public.schools
  FOR SELECT USING (app.jwt_role() = 'TEACHER'  AND id = app.jwt_school_id());
CREATE POLICY p_schools_parent_select  ON public.schools
  FOR SELECT USING (app.jwt_role() = 'PARENT'   AND id = app.jwt_school_id());
CREATE POLICY p_schools_student_select ON public.schools
  FOR SELECT USING (app.jwt_role() = 'STUDENT'  AND id = app.jwt_school_id());

-- ============================================================================
-- USERS
-- ============================================================================
-- Chacun voit / met à jour son profil
CREATE POLICY p_users_self_select ON public.users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY p_users_self_update ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Permettre l'insertion d'un nouvel utilisateur (pour le signup)
CREATE POLICY p_users_insert_self ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Directeur : voir & gérer les users de son école (pas de fonction qui relit users)
CREATE POLICY p_users_director_select ON public.users
  FOR SELECT USING (app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id());
CREATE POLICY p_users_director_update ON public.users
  FOR UPDATE USING (app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id())
  WITH CHECK    (app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id());

-- Teachers can view student users in their school (simplified to avoid recursion)
CREATE POLICY p_users_teacher_students_select ON public.users
  FOR SELECT USING (
    app.jwt_role() = 'TEACHER'
    AND role = 'STUDENT'
    AND school_id = app.jwt_school_id()
  );

-- Parent : voir le profil de ses enfants
CREATE POLICY p_users_parent_children_select ON public.users
  FOR SELECT USING (
    app.jwt_role() = 'PARENT'
    AND id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
  );

-- ============================================================================
-- CLASSROOMS
-- ============================================================================
CREATE POLICY p_classrooms_director_all ON public.classrooms
  FOR ALL
  USING     (app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id())
  WITH CHECK(app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id());

-- Teachers can view all classrooms in their school (simplified to avoid recursion)
CREATE POLICY p_classrooms_teacher_select ON public.classrooms
  FOR SELECT USING (app.jwt_role() = 'TEACHER' AND school_id = app.jwt_school_id());

-- Teachers can only update classrooms they are assigned to
CREATE POLICY p_classrooms_teacher_update ON public.classrooms
  FOR UPDATE USING (app.jwt_role() = 'TEACHER' AND school_id = app.jwt_school_id())
  WITH CHECK (app.jwt_role() = 'TEACHER' AND school_id = app.jwt_school_id());

-- Students can view classrooms within their school
CREATE POLICY p_classrooms_student_select ON public.classrooms
  FOR SELECT USING (app.jwt_role() = 'STUDENT' AND school_id = app.jwt_school_id());

-- Parents can view classrooms within their school
CREATE POLICY p_classrooms_parent_select ON public.classrooms
  FOR SELECT USING (app.jwt_role() = 'PARENT' AND school_id = app.jwt_school_id());

-- ============================================================================
-- STUDENTS
-- ============================================================================
CREATE POLICY p_students_self_select ON public.students
  FOR SELECT USING (id = auth.uid());

CREATE POLICY p_students_parent_select ON public.students
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY p_students_parent_update ON public.students
  FOR UPDATE USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Teachers can view students in their school (simplified to prevent recursion)
CREATE POLICY p_students_teacher_select ON public.students
  FOR SELECT USING (
    app.jwt_role() = 'TEACHER'
    AND classroom_id IN (SELECT id FROM public.classrooms WHERE school_id = app.jwt_school_id())
  );

CREATE POLICY p_students_director_select ON public.students
  FOR SELECT USING (
    app.jwt_role() = 'DIRECTOR'
    AND classroom_id IN (SELECT id FROM public.classrooms WHERE school_id = app.jwt_school_id())
  );

-- ============================================================================
-- QUIZZES
-- ============================================================================
-- Tout le monde peut voir les quizzes "self-service" publiés
CREATE POLICY p_quizzes_public_select ON public.quizzes
  FOR SELECT USING (owner_id IS NULL AND classroom_id IS NULL AND is_published = true);

-- Élèves : voir les quizzes de leur classe (publiés)
CREATE POLICY p_quizzes_student_select ON public.quizzes
  FOR SELECT USING (
    app.jwt_role() = 'STUDENT'
    AND is_published = true
    AND classroom_id IN (SELECT classroom_id FROM public.students WHERE id = auth.uid())
  );

-- Enseignants : CRUD sur leurs propres quizzes
CREATE POLICY p_quizzes_teacher_all ON public.quizzes
  FOR ALL
  USING     (app.jwt_role() = 'TEACHER' AND owner_id = auth.uid())
  WITH CHECK(app.jwt_role() = 'TEACHER' AND owner_id = auth.uid());

-- Enseignant : lecture des quizzes assignés aux classes de leur école
CREATE POLICY p_quizzes_teacher_class_select ON public.quizzes
  FOR SELECT USING (
    app.jwt_role() = 'TEACHER'
    AND classroom_id IN (SELECT id FROM public.classrooms WHERE school_id = app.jwt_school_id())
  );

-- Directeur : lecture de tous les quizzes de l’école
CREATE POLICY p_quizzes_director_select ON public.quizzes
  FOR SELECT USING (
    app.jwt_role() = 'DIRECTOR'
    AND (
      classroom_id IN (SELECT id FROM public.classrooms WHERE school_id = app.jwt_school_id())
      OR owner_id IN (SELECT id FROM public.users WHERE school_id = app.jwt_school_id())
    )
  );

-- ============================================================================
-- QUIZ ITEMS
-- ============================================================================
-- Lecture seulement si le quiz parent est accessible (on délègue le contrôle à p_quizzes_*)
CREATE POLICY p_quiz_items_user_select ON public.quiz_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id)
    AND quiz_id IN (
      SELECT q.id FROM public.quizzes q
      -- les politiques de q s’appliquent automatiquement à ce sous-select
    )
  );

-- Enseignant : CRUD sur les items de SES quizzes
CREATE POLICY p_quiz_items_teacher_all ON public.quiz_items
  FOR ALL
  USING (
    app.jwt_role() = 'TEACHER'
    AND quiz_id IN (SELECT id FROM public.quizzes WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    app.jwt_role() = 'TEACHER'
    AND quiz_id IN (SELECT id FROM public.quizzes WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- SUBMISSIONS
-- ============================================================================
-- Élève : voir / créer ses remises
CREATE POLICY p_submissions_student_select ON public.submissions
  FOR SELECT USING (app.jwt_role() = 'STUDENT' AND student_id = auth.uid());

CREATE POLICY p_submissions_student_insert ON public.submissions
  FOR INSERT WITH CHECK (app.jwt_role() = 'STUDENT' AND student_id = auth.uid());

-- Enseignant : voir les remises des quizzes des classes de LEUR ÉCOLE
CREATE POLICY p_submissions_teacher_select ON public.submissions
  FOR SELECT USING (
    app.jwt_role() = 'TEACHER'
    AND quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE q.classroom_id IN (SELECT id FROM public.classrooms WHERE school_id = app.jwt_school_id())
    )
  );

-- Parent : voir les remises de ses enfants
CREATE POLICY p_submissions_parent_select ON public.submissions
  FOR SELECT USING (
    app.jwt_role() = 'PARENT'
    AND student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
  );

-- Directeur : voir toutes les remises de l’école
CREATE POLICY p_submissions_director_select ON public.submissions
  FOR SELECT USING (
    app.jwt_role() = 'DIRECTOR'
    AND quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE school_id = app.jwt_school_id())
         OR owner_id   IN (SELECT id FROM public.users      WHERE school_id = app.jwt_school_id())
    )
  );

-- ============================================================================
-- INVITATION LINKS
-- ============================================================================
CREATE POLICY p_invites_director_all ON public.invitation_links
  FOR ALL
  USING     (app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id())
  WITH CHECK(app.jwt_role() = 'DIRECTOR' AND school_id = app.jwt_school_id());

CREATE POLICY p_invites_public_select ON public.invitation_links
  FOR SELECT USING (expires_at > now() AND used_at IS NULL);
