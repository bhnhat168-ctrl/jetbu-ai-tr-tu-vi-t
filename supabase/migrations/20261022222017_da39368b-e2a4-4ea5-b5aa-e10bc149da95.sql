REVOKE EXECUTE ON FUNCTION public.search_knowledge_chunks(text, text, text, int, vector) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.knowledge_md_titles(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jetbu_md_after_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jetbu_chunk_doc(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks(text, text, text, int, vector) TO service_role;
GRANT EXECUTE ON FUNCTION public.knowledge_md_titles(text) TO service_role;