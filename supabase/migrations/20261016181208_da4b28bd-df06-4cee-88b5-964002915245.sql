GRANT SELECT ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read companies" ON public.companies;
CREATE POLICY "Public can read companies" ON public.companies FOR SELECT TO anon, authenticated USING (true);