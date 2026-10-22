-- =====================================================================
-- JETBU AI — REBIRTH 2026 · Migration duy nhất (idempotent, chạy lại an toàn)
-- 7 bảng: ai_api_gateways, knowledge_md_store, books_luc_dao, daily_world_news,
--         legal_knowledge, meeting_transcripts, admin_advisor_logs
-- + pgvector (tùy chọn) + Full-Text Search + trigger gom mọi tài liệu về Kho .md
-- RLS: mở USING (true) / WITH CHECK (true) theo yêu cầu Admin để không bao giờ lỗi khi bấm Lưu.
-- Ngoại lệ an toàn: cột api_key của ai_api_gateways KHÔNG cấp quyền đọc cho anon/authenticated
-- (trình duyệt đọc qua view ai_api_gateways_public; khóa chỉ dùng phía máy chủ).
-- =====================================================================

SET search_path TO public, extensions;

-- Extensions: đặt vào schema "extensions" (chuẩn Supabase) nếu có, nếu không thì public. Đã có sẵn ở đâu thì giữ nguyên.
DO $$
DECLARE s text := CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN 'extensions' ELSE 'public' END;
BEGIN
  EXECUTE format('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA %I', s);
  EXECUTE format('CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA %I', s);
  EXECUTE format('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA %I', s);
END $$;

-- Hàm chuẩn hóa tiếng Việt cho FTS (bỏ dấu, chữ thường) — IMMUTABLE để dùng trong generated column / index
CREATE OR REPLACE FUNCTION public.jetbu_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, extensions AS $$
  SELECT lower(unaccent('unaccent', coalesce(t, '')));
$$;

-- ---------------------------------------------------------------------
-- 1) NHÁNH 1 — Cổng AI (Smart AI Hub)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_api_gateways (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                       -- Tên AI hiển thị
  model_id      text NOT NULL,                       -- VD: Llama-4-Maverick-17B-128E-Instruct-FP8
  base_url      text NOT NULL,                       -- OpenAI-compatible, VD: https://api.llama.com/compat/v1
  api_key       text NOT NULL DEFAULT '',            -- CHỈ máy chủ đọc (xem GRANT bên dưới)
  key_last4     text GENERATED ALWAYS AS (right(api_key, 4)) STORED,
  supports_json boolean NOT NULL DEFAULT true,
  priority      int NOT NULL DEFAULT 100,            -- nhỏ hơn = ưu tiên hơn
  enabled       boolean NOT NULL DEFAULT true,
  is_healthy    boolean NOT NULL DEFAULT true,       -- auto-failover cập nhật
  last_error    text,
  last_status   int,
  last_checked  timestamptz,
  fail_count    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
CREATE OR REPLACE VIEW public.ai_api_gateways_public AS
  SELECT id, name, model_id, base_url, key_last4, supports_json, priority, enabled, is_healthy, last_error, last_status, last_checked, fail_count, created_at, updated_at
  FROM public.ai_api_gateways;

-- ---------------------------------------------------------------------
-- 2) NHÁNH 2 — Kho Tri Thức .MD siêu nhẹ (Bộ Não Thứ 2) — bảng trung tâm của RAG Tầng 1
--    category ↔ thư mục Google Drive:
--    so_ghi_chu(00) | nao_bo_2(01) | sach_luc_dao(02) | the_gioi(03) | phap_luat(04) | bien_ban(05) | van_ban(06)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_md_store (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code   text NOT NULL DEFAULT 'JETBU_HQ',
  category       text NOT NULL DEFAULT 'nao_bo_2'
                 CHECK (category IN ('so_ghi_chu','nao_bo_2','sach_luc_dao','the_gioi','phap_luat','bien_ban','van_ban')),
  title          text NOT NULL,
  file_name      text NOT NULL,                      -- tên file .md tiếng Việt ngăn nắp
  content_md     text NOT NULL,                      -- nội dung markdown đã nén
  source_type    text NOT NULL DEFAULT 'upload'      -- upload|text|link|source_download|notebooklm|claude|auto
                 ,
  source_url     text,                               -- khóa chống trùng khi [Chấp nhận vào nguồn tri thức]
  source_name    text,                               -- OpenAlex / SuttaCentral / ...
  tags           text[] NOT NULL DEFAULT '{}',
  word_count     int GENERATED ALWAYS AS (greatest(1, array_length(regexp_split_to_array(content_md, '\s+'), 1))) STORED,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  verified_by    text[] NOT NULL DEFAULT '{}',       -- danh sách AI đã kiểm chứng (Tầng 3)
  embedding      vector(1536),                       -- tùy chọn (Gemini embedding), FTS là chính
  fts            tsvector GENERATED ALWAYS AS (
                   setweight(to_tsvector('simple', public.jetbu_norm(title)), 'A') ||
                   setweight(to_tsvector('simple', public.jetbu_norm(left(content_md, 200000))), 'B')
                 ) STORED,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_md_store_source_url_uq
  ON public.knowledge_md_store (company_code, source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS knowledge_md_store_fts_idx ON public.knowledge_md_store USING gin (fts);
CREATE INDEX IF NOT EXISTS knowledge_md_store_title_trgm_idx ON public.knowledge_md_store USING gin (public.jetbu_norm(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS knowledge_md_store_cat_idx ON public.knowledge_md_store (company_code, category, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_md_store_embedding_idx ON public.knowledge_md_store USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ---------------------------------------------------------------------
-- 3) NHÁNH 3 — Sách & Công trình "Lục Đạo Luân Hồi"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.books_luc_dao (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code   text NOT NULL DEFAULT 'JETBU_HQ',
  title_vi       text NOT NULL,                      -- tên sách tiếng Việt
  topic          text NOT NULL,                      -- đề tài gốc Admin yêu cầu / Bộ não đề xuất
  origin         text NOT NULL DEFAULT 'admin' CHECK (origin IN ('admin','neural_graph')),
  cycle_round    int NOT NULL DEFAULT 1,             -- vòng N của Lục Đạo
  realms         jsonb NOT NULL DEFAULT '[]'::jsonb, -- 6 cõi: sinh_thai→giao_duc→nang_luong→ha_tang→kinh_te_so→xa_hoi
  applications   jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{enterprise, industry, info, deployment}]
  council_log    jsonb NOT NULL DEFAULT '[]'::jsonb, -- phản biện chéo giữa các AI
  ai_participants text[] NOT NULL DEFAULT '{}',
  content_md     text NOT NULL,                      -- sách hoàn chỉnh (markdown)
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4) NHÁNH 4 — "Thế Giới Trong Tay Mỗi Ngày" & Tri Thức Pháp Luật
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_world_news (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code   text NOT NULL DEFAULT 'JETBU_HQ',
  news_date      date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  title          text NOT NULL,
  content_md     text NOT NULL,
  market_view    jsonb NOT NULL DEFAULT '{}'::jsonb, -- {stocks, gold, usd, crypto: {bias, reason}}
  sources        jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{title,url,source}]
  verified_by    text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS daily_world_news_date_idx ON public.daily_world_news (company_code, news_date DESC);

CREATE TABLE IF NOT EXISTS public.legal_knowledge (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code   text NOT NULL DEFAULT 'JETBU_HQ',
  jurisdiction   text NOT NULL DEFAULT 'VN' CHECK (jurisdiction IN ('VN','INTL','BOTH')),
  question       text NOT NULL,
  title          text NOT NULL,
  content_md     text NOT NULL,
  risk_level     text CHECK (risk_level IN ('do','vang','xanh')),
  citations      jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_by    text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5) NHÁNH 5 — Biên bản họp (Speaker Diarization) & Nhật ký Cố vấn Admin
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code   text NOT NULL DEFAULT 'JETBU_HQ',
  title          text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  duration_sec   int NOT NULL DEFAULT 0,
  speakers       jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{label:"Người nói 1", name:"..."}]
  segments       jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{t0,t1,speaker,text}]
  transcript_md  text NOT NULL DEFAULT '',
  summary_md     text,
  mode           text NOT NULL DEFAULT 'full' CHECK (mode IN ('full','summary')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_advisor_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code   text NOT NULL DEFAULT 'JETBU_HQ',
  kind           text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat','voice','reminder','schedule','finance','command')),
  role           text NOT NULL CHECK (role IN ('user','assistant','system')),
  content        text NOT NULL,
  tier_used      int,                                -- 1=Kho nội bộ, 2=Nguồn ngoài, 3=Hội đồng AI
  citations      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_name        text,
  due_at         timestamptz,                        -- cho nhắc nhở / lịch
  done           boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_advisor_logs_idx ON public.admin_advisor_logs (company_code, created_at DESC);

-- ---------------------------------------------------------------------
-- updated_at tự động
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jetbu_touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_touch_gateways ON public.ai_api_gateways;
CREATE TRIGGER trg_touch_gateways BEFORE UPDATE ON public.ai_api_gateways FOR EACH ROW EXECUTE FUNCTION public.jetbu_touch();
DROP TRIGGER IF EXISTS trg_touch_md ON public.knowledge_md_store;
CREATE TRIGGER trg_touch_md BEFORE UPDATE ON public.knowledge_md_store FOR EACH ROW EXECUTE FUNCTION public.jetbu_touch();

-- ---------------------------------------------------------------------
-- TRIGGER GOM VỀ KHO .MD: mọi sách / bản tin / pháp luật / biên bản họp khi lưu
-- đều tự sinh 1 file .md trong knowledge_md_store (đúng thư mục) → Tầng 1 RAG thấy ngay.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jetbu_slug(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT trim(both '_' from regexp_replace(public.jetbu_norm(t), '[^a-z0-9]+', '_', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.jetbu_mirror_to_md() RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE v_cat text; v_title text; v_md text; v_url text; v_day text;
BEGIN
  v_day := to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD');
  IF TG_TABLE_NAME = 'books_luc_dao' THEN
    v_cat := 'sach_luc_dao'; v_title := NEW.title_vi; v_md := NEW.content_md;
  ELSIF TG_TABLE_NAME = 'daily_world_news' THEN
    v_cat := 'the_gioi'; v_title := NEW.title; v_md := NEW.content_md;
  ELSIF TG_TABLE_NAME = 'legal_knowledge' THEN
    v_cat := 'phap_luat'; v_title := NEW.title; v_md := NEW.content_md;
  ELSIF TG_TABLE_NAME = 'meeting_transcripts' THEN
    v_cat := 'bien_ban'; v_title := NEW.title;
    v_md := coalesce(NEW.summary_md, '') || E'\n\n---\n\n' || NEW.transcript_md;
  ELSE RETURN NEW; END IF;
  v_url := 'jetbu://' || TG_TABLE_NAME || '/' || NEW.id::text;
  INSERT INTO public.knowledge_md_store (company_code, category, title, file_name, content_md, source_type, source_url, source_name, tags)
  VALUES (NEW.company_code, v_cat, v_title, v_day || '_' || public.jetbu_slug(v_title) || '.md', v_md, 'auto', v_url, TG_TABLE_NAME, ARRAY[v_cat])
  ON CONFLICT (company_code, source_url) WHERE source_url IS NOT NULL
  DO UPDATE SET title = EXCLUDED.title, content_md = EXCLUDED.content_md, updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mirror_books ON public.books_luc_dao;
CREATE TRIGGER trg_mirror_books AFTER INSERT OR UPDATE OF content_md, title_vi ON public.books_luc_dao FOR EACH ROW EXECUTE FUNCTION public.jetbu_mirror_to_md();
DROP TRIGGER IF EXISTS trg_mirror_news ON public.daily_world_news;
CREATE TRIGGER trg_mirror_news AFTER INSERT OR UPDATE OF content_md, title ON public.daily_world_news FOR EACH ROW EXECUTE FUNCTION public.jetbu_mirror_to_md();
DROP TRIGGER IF EXISTS trg_mirror_legal ON public.legal_knowledge;
CREATE TRIGGER trg_mirror_legal AFTER INSERT OR UPDATE OF content_md, title ON public.legal_knowledge FOR EACH ROW EXECUTE FUNCTION public.jetbu_mirror_to_md();
DROP TRIGGER IF EXISTS trg_mirror_meetings ON public.meeting_transcripts;
CREATE TRIGGER trg_mirror_meetings AFTER INSERT OR UPDATE OF transcript_md, summary_md ON public.meeting_transcripts FOR EACH ROW EXECUTE FUNCTION public.jetbu_mirror_to_md();

-- ---------------------------------------------------------------------
-- TẦNG 1 RAG: tìm kiếm Kho .md (FTS tiếng Việt không dấu + trigram, có pgvector thì cộng điểm)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge_md(
  q text, p_company text DEFAULT NULL, p_category text DEFAULT NULL, p_limit int DEFAULT 8, query_embedding vector(1536) DEFAULT NULL
) RETURNS TABLE (id uuid, category text, title text, file_name text, snippet text, content_md text, source_url text, source_name text, score real)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  WITH nq AS (SELECT public.jetbu_norm(q) AS n, websearch_to_tsquery('simple', public.jetbu_norm(q)) AS tsq)
  SELECT k.id, k.category, k.title, k.file_name,
         left(regexp_replace(k.content_md, '\s+', ' ', 'g'), 400) AS snippet,
         k.content_md, k.source_url, k.source_name,
         ( ts_rank_cd(k.fts, nq.tsq) * 10
           + similarity(public.jetbu_norm(k.title), nq.n) * 3
           + CASE WHEN query_embedding IS NOT NULL AND k.embedding IS NOT NULL THEN (1 - (k.embedding <=> query_embedding)) * 5 ELSE 0 END
         )::real AS score
  FROM public.knowledge_md_store k, nq
  WHERE k.status = 'active'
    AND (p_company IS NULL OR k.company_code = p_company)
    AND (p_category IS NULL OR k.category = p_category)
    AND ( k.fts @@ nq.tsq
          OR public.jetbu_norm(k.title) % nq.n
          OR public.jetbu_norm(k.title) ILIKE '%' || nq.n || '%'
          OR (query_embedding IS NOT NULL AND k.embedding IS NOT NULL AND (1 - (k.embedding <=> query_embedding)) > 0.75) )
  ORDER BY score DESC, k.created_at DESC
  LIMIT greatest(1, least(p_limit, 30));
$$;

-- Thống kê Kho theo thư mục (cho Nhánh 6 & đồ thị 3D)
CREATE OR REPLACE FUNCTION public.knowledge_md_stats(p_company text DEFAULT NULL)
RETURNS TABLE (category text, docs bigint, words bigint, last_at timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT category, count(*), coalesce(sum(word_count),0), max(created_at)
  FROM public.knowledge_md_store WHERE status='active' AND (p_company IS NULL OR company_code = p_company)
  GROUP BY category ORDER BY category;
$$;

-- ---------------------------------------------------------------------
-- RLS MỞ (USING true / WITH CHECK true) + GRANT — theo yêu cầu, trừ cột api_key
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['knowledge_md_store','books_luc_dao','daily_world_news','legal_knowledge','meeting_transcripts','admin_advisor_logs']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "jetbu_open_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "jetbu_open_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ai_api_gateways: trình duyệt chỉ được đọc view (không có api_key); ghi qua máy chủ (service_role)
GRANT ALL ON public.ai_api_gateways TO service_role;
REVOKE ALL ON public.ai_api_gateways FROM anon, authenticated;
GRANT SELECT ON public.ai_api_gateways_public TO anon, authenticated, service_role;
ALTER TABLE public.ai_api_gateways ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jetbu_gateways_service" ON public.ai_api_gateways;
CREATE POLICY "jetbu_gateways_service" ON public.ai_api_gateways FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.search_knowledge_md(text, text, text, int, vector) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.knowledge_md_stats(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.jetbu_norm(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.jetbu_slug(text) TO anon, authenticated, service_role;

-- Dữ liệu khởi tạo: ghi chú hướng dẫn đầu tiên trong Bộ Não Thứ 2 (không ghi đè nếu đã có)
INSERT INTO public.knowledge_md_store (category, title, file_name, content_md, source_type, source_url, source_name, tags)
SELECT 'so_ghi_chu', 'Hiến pháp Trung thực Học thuật JETBU AI', '2026-10-23_hien_phap_trung_thuc_hoc_thuat.md',
E'# Hiến pháp Trung thực Học thuật (3-Tier Truth Protocol)\n\n1. **Tầng 1 – Kho Tri Thức nội bộ trước tiên**: mọi câu hỏi đều tra Kho .md trước, trích dẫn đúng tên file và đoạn gốc. Có thì nói có, thiếu thì nói rõ phần thiếu. Không suy diễn.\n2. **Tầng 2 – Nguồn mở bên ngoài**: chỉ khi Kho thiếu mới gọi OpenAlex, Wikidata, arXiv, Archive.org, Hugging Face, SuttaCentral, CBETA, Sefaria, CTEXT, GDELT.\n3. **Tầng 3 – Hội đồng AI đối chiếu chéo**: thông tin bên ngoài phải được tất cả AI đang hoạt động kiểm chứng; chỉ giữ lại điều có căn cứ.\n',
'auto', 'jetbu://seed/hien-phap', 'seed', ARRAY['so_ghi_chu','quy_tac']
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_md_store WHERE source_url = 'jetbu://seed/hien-phap');
