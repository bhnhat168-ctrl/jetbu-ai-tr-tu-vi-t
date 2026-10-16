ALTER TABLE public.approval_reports ADD COLUMN IF NOT EXISTS draft_content text;
GRANT SELECT, INSERT ON public.approval_reports TO anon, authenticated;
GRANT ALL ON public.approval_reports TO service_role;
ALTER TABLE public.approval_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read reports" ON public.approval_reports;
DROP POLICY IF EXISTS "Submit draft reports" ON public.approval_reports;
CREATE POLICY "Read reports" ON public.approval_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Submit draft reports" ON public.approval_reports FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND approved_path IS NULL AND signature_hash IS NULL AND length(title) BETWEEN 1 AND 300);

GRANT SELECT ON public.gps_checkins TO anon, authenticated;
GRANT ALL ON public.gps_checkins TO service_role;
ALTER TABLE public.gps_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read checkins" ON public.gps_checkins;
CREATE POLICY "Read checkins" ON public.gps_checkins FOR SELECT TO anon, authenticated USING (true);