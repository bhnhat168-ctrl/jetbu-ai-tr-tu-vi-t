DROP POLICY IF EXISTS "jetbu_open_all" ON public.legal_knowledge;
REVOKE INSERT, UPDATE, DELETE ON public.legal_knowledge FROM anon, authenticated;
REVOKE SELECT ON public.legal_knowledge FROM anon;
GRANT SELECT ON public.legal_knowledge TO authenticated;
GRANT ALL ON public.legal_knowledge TO service_role;
CREATE POLICY "jetbu_read_scoped" ON public.legal_knowledge FOR SELECT TO authenticated
  USING (public.is_group_admin() OR public.v7_company_access(company_code, false));
CREATE POLICY "jetbu_service" ON public.legal_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);