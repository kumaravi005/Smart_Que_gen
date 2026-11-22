-- 004_add_comment_to_question_bank.sql
-- Add comment column for board exam year/set and teacher notes

ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS comment TEXT;
