CREATE TABLE IF NOT EXISTS public.knowledge_md_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES public.knowledge_md_store(id) ON DELETE CASCADE,
  company_code text NOT NULL,
  category text NOT NULL,
  chunk_index int NOT NULL,
  heading text,
  content text NOT NULL,
  fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', public.jetbu_norm(content))) STORED,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_md_chunks_fts_idx ON public.knowledge_md_chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS knowledge_md_chunks_doc_idx ON public.knowledge_md_chunks (doc_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_md_chunks_company_idx ON public.knowledge_md_chunks (company_code);

GRANT SELECT ON public.knowledge_md_chunks TO authenticated;
GRANT ALL ON public.knowledge_md_chunks TO service_role;
ALTER TABLE public.knowledge_md_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chunks_read_scoped" ON public.knowledge_md_chunks;
CREATE POLICY "chunks_read_scoped" ON public.knowledge_md_chunks FOR SELECT TO authenticated
  USING (public.is_group_admin() OR public.v7_company_access(company_code, false));
DROP POLICY IF EXISTS "chunks_service" ON public.knowledge_md_chunks;
CREATE POLICY "chunks_service" ON public.knowledge_md_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Siết quyền các bảng đang mở toàn bộ
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['knowledge_md_store','meeting_transcripts','admin_advisor_logs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "jetbu_open_all" ON public.%I', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "jetbu_read_scoped" ON public.%I', t);
    EXECUTE format('CREATE POLICY "jetbu_read_scoped" ON public.%I FOR SELECT TO authenticated USING (public.is_group_admin() OR public.v7_company_access(company_code, false))', t);
    EXECUTE format('DROP POLICY IF EXISTS "jetbu_service" ON public.%I', t);
    EXECUTE format('CREATE POLICY "jetbu_service" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.jetbu_chunk_doc(p_doc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  d record; line text; heading text := NULL; block text := ''; idx int := 0;
  lines text[]; para text; buf text; i int;
BEGIN
  SELECT id, company_code, category, title, content_md INTO d FROM public.knowledge_md_store WHERE id = p_doc;
  DELETE FROM public.knowledge_md_chunks WHERE doc_id = p_doc;
  IF d.id IS NULL OR coalesce(d.content_md,'') = '' THEN RETURN; END IF;
  lines := string_to_array(d.content_md || E'\n#__END__', E'\n');
  FOR i IN 1 .. array_length(lines, 1) LOOP
    line := lines[i];
    IF line ~ '^#' THEN
      IF btrim(block) <> '' THEN
        buf := '';
        FOREACH para IN ARRAY regexp_split_to_array(block, E'\n\\s*\n') LOOP
          IF btrim(para) = '' THEN CONTINUE; END IF;
          IF length(buf) > 0 AND length(buf) + length(para) + 2 > 1500 THEN
            INSERT INTO public.knowledge_md_chunks(doc_id, company_code, category, chunk_index, heading, content)
              VALUES (d.id, d.company_code, d.category, idx, coalesce(heading, d.title), buf);
            idx := idx + 1; buf := '';
          END IF;
          WHILE length(para) > 1500 LOOP
            IF length(buf) > 0 THEN
              INSERT INTO public.knowledge_md_chunks(doc_id, company_code, category, chunk_index, heading, content)
                VALUES (d.id, d.company_code, d.category, idx, coalesce(heading, d.title), buf);
              idx := idx + 1; buf := '';
            END IF;
            INSERT INTO public.knowledge_md_chunks(doc_id, company_code, category, chunk_index, heading, content)
              VALUES (d.id, d.company_code, d.category, idx, coalesce(heading, d.title), left(para, 1500));
            idx := idx + 1; para := substr(para, 1501);
          END LOOP;
          buf := CASE WHEN buf = '' THEN para ELSE buf || E'\n\n' || para END;
        END LOOP;
        IF btrim(buf) <> '' THEN
          INSERT INTO public.knowledge_md_chunks(doc_id, company_code, category, chunk_index, heading, content)
            VALUES (d.id, d.company_code, d.category, idx, coalesce(heading, d.title), buf);
          idx := idx + 1;
        END IF;
      END IF;
      heading := btrim(regexp_replace(line, '^#+\s*', ''));
      block := line;
    ELSE
      block := block || E'\n' || line;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.jetbu_auto_tags(p_title text, p_content text) RETURNS text[]
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT coalesce(array_agg(w ORDER BY c DESC, w), ARRAY[]::text[]) FROM (
    SELECT w, count(*) AS c
    FROM regexp_split_to_table(public.jetbu_norm(coalesce(p_title,'') || ' ' || left(coalesce(p_content,''), 20000)), '[^a-z0-9]+') AS w
    WHERE length(w) >= 5
      AND w <> ALL (ARRAY['nhung','cua','trong','duoc','voi','cho','nay','nhu','khong','cac','mot','nguoi','theo','cung','phai','tren','nhieu','khi','bang','hoac'])
    GROUP BY w ORDER BY c DESC, w LIMIT 8
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.jetbu_md_after_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public.jetbu_chunk_doc(NEW.id);
  IF coalesce(array_length(NEW.tags,1),0) = 0 OR NEW.tags = ARRAY[NEW.category] THEN
    UPDATE public.knowledge_md_store
      SET tags = public.jetbu_auto_tags(NEW.title, NEW.content_md) || ARRAY[NEW.category]
      WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_md_chunks ON public.knowledge_md_store;
CREATE TRIGGER trg_md_chunks AFTER INSERT OR UPDATE OF content_md, title ON public.knowledge_md_store
  FOR EACH ROW EXECUTE FUNCTION public.jetbu_md_after_write();

-- Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, title, content_md, category, tags FROM public.knowledge_md_store WHERE status = 'active' LOOP
    PERFORM public.jetbu_chunk_doc(r.id);
    IF coalesce(array_length(r.tags,1),0) = 0 OR r.tags = ARRAY[r.category] THEN
      UPDATE public.knowledge_md_store SET tags = public.jetbu_auto_tags(r.title, r.content_md) || ARRAY[r.category] WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
  q text, p_company text DEFAULT NULL, p_category text DEFAULT NULL, p_limit int DEFAULT 24,
  query_embedding vector(1536) DEFAULT NULL
) RETURNS TABLE(chunk_id uuid, doc_id uuid, title text, file_name text, category text, heading text, content text, score real)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  nq text := public.jetbu_norm(q);
  tsq_or tsquery; tsq_web tsquery; lim int := least(greatest(coalesce(p_limit,24),1), 80);
  terms text;
BEGIN
  SELECT string_agg(DISTINCT w, ' | ') INTO terms
    FROM regexp_split_to_table(nq, '[^a-z0-9]+') w WHERE length(w) >= 3;
  IF terms IS NULL THEN RETURN; END IF;
  tsq_or := to_tsquery('simple', terms);
  tsq_web := websearch_to_tsquery('simple', nq);
  RETURN QUERY
    SELECT c.id, c.doc_id, d.title, d.file_name, c.category, c.heading, c.content,
      (ts_rank_cd(c.fts, tsq_or) * 10 + (c.fts @@ tsq_web)::int * 5
        + similarity(public.jetbu_norm(d.title), nq) * 3
        + CASE WHEN query_embedding IS NOT NULL AND c.embedding IS NOT NULL
               THEN (1 - (c.embedding <=> query_embedding)) * 5 ELSE 0 END)::real
    FROM public.knowledge_md_chunks c JOIN public.knowledge_md_store d ON d.id = c.doc_id
    WHERE d.status = 'active' AND c.fts @@ tsq_or
      AND (p_company IS NULL OR c.company_code = p_company)
      AND (p_category IS NULL OR c.category = p_category)
    ORDER BY 8 DESC LIMIT lim;
  IF NOT FOUND AND p_company IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.search_knowledge_chunks(q, NULL, p_category, lim, query_embedding);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.knowledge_md_titles(p_company text DEFAULT NULL)
RETURNS TABLE(id uuid, title text, file_name text, category text, word_count int, tags text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT d.id, d.title, d.file_name, d.category, d.word_count, d.tags
    FROM public.knowledge_md_store d
    WHERE d.status = 'active' AND (p_company IS NULL OR d.company_code = p_company)
    ORDER BY d.created_at DESC LIMIT 300;
  IF NOT FOUND AND p_company IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.knowledge_md_titles(NULL);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.jetbu_chunk_doc(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jetbu_chunk_doc(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.search_knowledge_chunks(text, text, text, int, vector) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks(text, text, text, int, vector) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.knowledge_md_titles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.knowledge_md_titles(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.jetbu_auto_tags(text, text) TO authenticated, service_role;