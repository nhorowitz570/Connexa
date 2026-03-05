-- Allow users to delete their own briefs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'briefs'
      AND policyname = 'Users can delete own briefs'
  ) THEN
    CREATE POLICY "Users can delete own briefs"
      ON public.briefs FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
