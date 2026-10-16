CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tax_code text, ADD COLUMN IF NOT EXISTS representative text, ADD COLUMN IF NOT EXISTS drive_root_folder_id text,
  ADD COLUMN IF NOT EXISTS brand_kit_json jsonb DEFAULT '{"primaryColor":"#0f172a","accentColor":"#f59e0b","fontFamily":"Times New Roman"}'::jsonb;
ALTER TABLE public.causal_graph_edges ADD COLUMN IF NOT EXISTS company_code text DEFAULT 'JETBU_HQ', ADD COLUMN IF NOT EXISTS source_type text, ADD COLUMN IF NOT EXISTS target_type text, ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.knowledge_vectors ADD COLUMN IF NOT EXISTS parent_context text, ADD COLUMN IF NOT EXISTS source_id text, ADD COLUMN IF NOT EXISTS status text DEFAULT 'active', ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.gps_checkins ADD COLUMN IF NOT EXISTS user_id uuid, ADD COLUMN IF NOT EXISTS department text, ADD COLUMN IF NOT EXISTS location_address text, ADD COLUMN IF NOT EXISTS task_note text, ADD COLUMN IF NOT EXISTS device_hash text;
ALTER TABLE public.approval_reports ADD COLUMN IF NOT EXISTS file_name text, ADD COLUMN IF NOT EXISTS is_embedded_to_rag boolean DEFAULT false, ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.employee_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code text,
  department text NOT NULL DEFAULT 'Ban Giám đốc',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('master_admin','company_admin','manager','staff')),
  storage_quota_gb numeric DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, company_id)
);
GRANT SELECT ON public.employee_companies TO authenticated;
GRANT ALL ON public.employee_companies TO service_role;
ALTER TABLE public.employee_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own memberships" ON public.employee_companies FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.folder_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code text NOT NULL,
  folder_id text NOT NULL,
  folder_name text NOT NULL,
  role text NOT NULL,
  department text,
  can_view boolean DEFAULT true, can_edit boolean DEFAULT false, can_delete boolean DEFAULT false, can_approve boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.folder_permissions TO anon, authenticated;
GRANT ALL ON public.folder_permissions TO service_role;
ALTER TABLE public.folder_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read folder permissions" ON public.folder_permissions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code text NOT NULL DEFAULT 'JETBU_HQ',
  title text NOT NULL,
  department text NOT NULL,
  assignee_name text,
  priority text DEFAULT 'high' CHECK (priority IN ('low','medium','high','urgent')),
  status text DEFAULT 'in_progress' CHECK (status IN ('pending','in_progress','completed','overdue')),
  assigned_at timestamptz DEFAULT now(),
  started_at timestamptz, completed_at timestamptz,
  gps_verified boolean DEFAULT false
);
GRANT SELECT, INSERT ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read tasks" ON public.tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Submit tasks" ON public.tasks FOR INSERT TO anon, authenticated
  WITH CHECK (length(title) BETWEEN 1 AND 300 AND length(department) BETWEEN 1 AND 120 AND completed_at IS NULL);

CREATE OR REPLACE FUNCTION public.match_jetbu_knowledge(query_embedding vector(1536), match_threshold float DEFAULT 0.7, match_count int DEFAULT 5, filter_domain text DEFAULT NULL)
RETURNS TABLE (id uuid, domain text, title text, content text, parent_context text, similarity float)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT k.id, k.domain, k.title, k.content, k.parent_context, 1 - (k.embedding <=> query_embedding)
  FROM public.knowledge_vectors k
  WHERE k.embedding IS NOT NULL AND coalesce(k.status,'active') = 'active'
    AND (filter_domain IS NULL OR k.domain = filter_domain)
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding LIMIT match_count;
$$;

INSERT INTO public.companies (name, code, tax_code, representative, drive_folder_id, drive_root_folder_id)
SELECT v.* FROM (VALUES
  ('Tập Đoàn Mẹ JETBU Holdings','JETBU_HQ','0109998881','Chủ tịch HĐQT','00_ROOT_DRIVE_5TB_HQ','00_ROOT_DRIVE_5TB_HQ'),
  ('Công Ty CP Đầu Tư & Định Lượng JETBU Capital','JETBU_CAP','0109998882','Giám đốc Quỹ','01_ROOT_DRIVE_CAPITAL','01_ROOT_DRIVE_CAPITAL'),
  ('Công Ty TNHH Pháp Lý & M&A Quốc Tế JETBU Law','JETBU_LAW','0109998883','Luật sư Điều hành','02_ROOT_DRIVE_LAW','02_ROOT_DRIVE_LAW'),
  ('Viện Nghiên Cứu Khoa Học & Chu Kỳ Vận 9','JETBU_LAB','0109998884','Viện trưởng','03_ROOT_DRIVE_LAB','03_ROOT_DRIVE_LAB')
) AS v(name,code,tax_code,representative,drive_folder_id,drive_root_folder_id)
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.code = v.code);

INSERT INTO public.causal_graph_edges (source_entity, source_type, relation_type, target_entity, target_type, impact_weight, description)
SELECT v.* FROM (VALUES
  ('Chu kỳ Hạ Nguyên Vận 9 (Hành Hỏa 2024-2043)','CosmicCycle','RESONATES','Bùng nổ AI, Bán dẫn & Năng lượng tái tạo','IndustrySector',0.92,'Dịch chuyển dòng vốn toàn cầu sang công nghệ lõi và hạ tầng năng lượng'),
  ('Căng thẳng Địa chính trị & Đứt gãy Chuỗi cung ứng','GeopoliticalEvent','TRIGGERS','Áp lực Lạm phát Chi phí đẩy & Lãi suất Neo cao','MacroIndicator',0.85,'Ngân hàng Trung ương trì hoãn cắt giảm lãi suất, chi phí vốn WACC tăng'),
  ('Chi phí Vốn WACC > ROIC & OCF Âm 2 Quý','MacroIndicator','DRAINS_LIQUIDITY','Rủi ro Đứt gãy Thanh khoản Doanh nghiệp Thâm dụng Vốn','Asset',0.95,'Kích hoạt điều kiện Phủ quyết (Veto) từ Agent 1 Quant & Capital')
) AS v(source_entity,source_type,relation_type,target_entity,target_type,impact_weight,description)
WHERE NOT EXISTS (SELECT 1 FROM public.causal_graph_edges e WHERE e.source_entity = v.source_entity AND e.target_entity = v.target_entity);