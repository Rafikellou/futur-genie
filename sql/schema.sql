-- DO NOT EDIT IN CODE: source of truth for DB structure
-- ============================================================================
-- SCHEMA – MVP (3 rôles: DIRECTOR, TEACHER, PARENT) — sans table "children"
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums via DO blocks (quotes simples à l'intérieur)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE 'CREATE TYPE user_role AS ENUM (''DIRECTOR'', ''TEACHER'', ''PARENT'')';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_level') THEN
    EXECUTE 'CREATE TYPE grade_level AS ENUM (''CP'',''CE1'',''CE2'',''CM1'',''CM2'',''6EME'',''5EME'',''4EME'',''3EME'')';
  END IF;
END$$;

-- Schools
CREATE TABLE IF NOT EXISTS public.schools (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  grade      grade_level NOT NULL,
  school_id  uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Users (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role             user_role NOT NULL,
  school_id        uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  classroom_id     uuid REFERENCES public.classrooms(id) ON DELETE SET NULL, -- requis pour TEACHER/PARENT
  email            text,
  full_name        text,
  child_first_name text,  -- champ informatif pour le parent
  created_at       timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT teacher_must_have_classroom CHECK (role <> 'TEACHER' OR classroom_id IS NOT NULL),
  CONSTRAINT parent_must_have_classroom  CHECK (role <> 'PARENT'  OR classroom_id IS NOT NULL)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         text NOT NULL,
  description   text,
  level         grade_level NOT NULL,
  owner_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  classroom_id  uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  school_id     uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Quiz items (dénormalisé)
CREATE TABLE IF NOT EXISTS public.quiz_items (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id       uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question      text NOT NULL,
  choices       jsonb NOT NULL,
  answer_keys   text[] NOT NULL,
  order_index   int4 NOT NULL DEFAULT 0,
  school_id     uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  classroom_id  uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Submissions (réponses des parents)
CREATE TABLE IF NOT EXISTS public.submissions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id          uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  parent_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answers          jsonb NOT NULL,
  score            int4 NOT NULL DEFAULT 0,
  total_questions  int4 NOT NULL DEFAULT 0,
  school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  classroom_id     uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Invitation links (toujours liés à une classe)
CREATE TABLE IF NOT EXISTS public.invitation_links (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  intended_role user_role NOT NULL, -- Store the intended role for the invitation
  token        text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_by   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role           ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_school         ON public.users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_classroom      ON public.users(classroom_id);

CREATE INDEX IF NOT EXISTS idx_classrooms_school    ON public.classrooms(school_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_owner        ON public.quizzes(owner_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_class        ON public.quizzes(classroom_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_school       ON public.quizzes(school_id);

CREATE INDEX IF NOT EXISTS idx_items_quiz           ON public.quiz_items(quiz_id);
CREATE INDEX IF NOT EXISTS idx_items_class          ON public.quiz_items(classroom_id);
CREATE INDEX IF NOT EXISTS idx_items_school         ON public.quiz_items(school_id);

CREATE INDEX IF NOT EXISTS idx_submissions_quiz     ON public.submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_parent   ON public.submissions(parent_id);
CREATE INDEX IF NOT EXISTS idx_submissions_class    ON public.submissions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_school   ON public.submissions(school_id);

CREATE INDEX IF NOT EXISTS idx_invites_token        ON public.invitation_links(token);
