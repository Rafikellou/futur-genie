-- Migration: Add published_at and unpublish_at columns to quizzes table
-- Date: 2025-01-05
-- Description: Add timestamp columns for quiz publication lifecycle management

-- Add the new columns to the quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS unpublish_at timestamptz;

-- Add a comment to document the purpose of these columns
COMMENT ON COLUMN public.quizzes.published_at IS 'Timestamp when the quiz was published';
COMMENT ON COLUMN public.quizzes.unpublish_at IS 'Timestamp when the quiz should be automatically unpublished (typically 7 days after publication)';
