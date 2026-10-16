GRANT SELECT ON public.causal_graph_edges TO anon, authenticated;
GRANT ALL ON public.causal_graph_edges TO service_role;
ALTER TABLE public.causal_graph_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read causal edges" ON public.causal_graph_edges;
CREATE POLICY "Public can read causal edges" ON public.causal_graph_edges FOR SELECT TO anon, authenticated USING (true);