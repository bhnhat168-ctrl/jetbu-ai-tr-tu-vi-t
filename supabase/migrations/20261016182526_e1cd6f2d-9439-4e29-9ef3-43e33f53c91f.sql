GRANT SELECT, INSERT ON public.knowledge_vectors TO anon, authenticated;
GRANT ALL ON public.knowledge_vectors TO service_role;
ALTER TABLE public.knowledge_vectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read knowledge" ON public.knowledge_vectors;
DROP POLICY IF EXISTS "Submit knowledge" ON public.knowledge_vectors;
CREATE POLICY "Read knowledge" ON public.knowledge_vectors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Submit knowledge" ON public.knowledge_vectors FOR INSERT TO anon, authenticated
  WITH CHECK (company_code IS NOT NULL AND length(title) BETWEEN 1 AND 500 AND length(content) BETWEEN 1 AND 20000);