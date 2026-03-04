-- Add user-facing brief metadata and pipeline timing/cancellation support.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum
    JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'brief_status' AND enum.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.brief_status ADD VALUE 'cancelled';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum
    JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'run_status' AND enum.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.run_status ADD VALUE 'cancelled';
  END IF;
END $$;

ALTER TABLE public.briefs
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.briefs
SET name = COALESCE(
  NULLIF(trim(normalized_brief->>'service_type'), ''),
  'Untitled - ' || to_char(created_at, 'Mon DD, YYYY')
)
WHERE name IS NULL;

UPDATE public.briefs
SET category = NULLIF(trim(substring(raw_prompt FROM 'Category:[ ]*([^\\n\\r]+)')), '')
WHERE mode = 'detailed'::public.brief_mode
  AND category IS NULL
  AND raw_prompt IS NOT NULL
  AND raw_prompt LIKE '%Category:%';
