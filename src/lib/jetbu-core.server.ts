/**
 * JETBU CORE ENGINE (Rebirth 2026) — chỉ chạy phía máy chủ (.server.ts → không bao giờ vào bundle trình duyệt).
 *
 *  1. SMART AI HUB + AUTO-FAILOVER : cổng AI từ biến môi trường + bảng ai_api_gateways (Admin thêm 1-click).
 *     Lỗi 401/402/403/429/5xx hoặc timeout → bỏ qua ngay, đánh dấu is_healthy=false (thử lại sau 10 phút).
 *  2. 3-TIER TRUTH PROTOCOL       : Tầng 1 Kho .md (FTS + pgvector) → Tầng 2 nguồn mở → Tầng 3 Hội đồng AI đối chiếu chéo.
 *  3. HỘI ĐỒNG LỤC ĐẠO LUÂN HỒI   : tất cả AI đang hoạt động cùng phân tích 6 cõi, Red Team phản biện, tổng hợp thành sách tiếng Việt.
 *  4. TÌM NGUỒN & XUẤT .MD        : OpenAlex, Wikidata, arXiv, Archive.org, Hugging Face, SuttaCentral, CBETA, Sefaria, CTEXT, GDELT.
 *
 *  Khóa API KHÔNG BAO GIỜ được gửi về trình duyệt. Mọi lời khẳng định đều phải có trích dẫn (file .md nội bộ hoặc URL ngoài đã kiểm chứng).
 */
import { getKey } from "./brain.server";

/* ============================================================================================
 * 0. KIỂU DỮ LIỆU CHUNG
 * ========================================================================================== */
export type Gateway = {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  key: string;
  json: boolean;
  priority: number;
  source: "env" | "db";
  anthropic?: boolean;
};
export type Msg = { role: "system" | "user" | "assistant"; content: string };
export type ExternalHit = {
  source: string;
  title: string;
  excerpt: string;
  url: string;
  citation: string;
  extra?: Record<string, unknown>;
};
export type InternalHit = {
  id: string;
  category: string;
  title: string;
  file_name: string;
  snippet: string;
  content_md: string;
  source_url: string | null;
  source_name: string | null;
  score: number;
  chunks?: number | undefined;
};
export type Citation = {
  kind: "internal" | "external";
  title: string;
  ref: string;
  source: string;
};
export type TruthAnswer = {
  answer_md: string;
  tier_used: 1 | 2 | 3;
  covered: string[];
  missing: string[];
  citations: Citation[];
  verified_by: string[];
  rejected: { title: string; url: string; reason: string }[];
  ai_name: string;
};

export class GatewayError extends Error {
  constructor(
    public gateway: string,
    public status: number,
    msg: string,
  ) {
    super(msg);
  }
}

const DEFAULT_TIMEOUT = 45_000;
const COOLDOWN_MS = 10 * 60 * 1000;
const COMPANY_DEFAULT = "JETBU_HQ";
const stripThink = (s: string) =>
  s
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<think>[\s\S]*$/g, "")
    .trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Bảng mới chưa có trong types.ts sinh tự động → dùng client không kiểu cho các bảng Rebirth.
  return supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
}

/* ============================================================================================
 * 1. SMART AI HUB + AUTO-FAILOVER
 * ========================================================================================== */
const envHealth = new Map<string, { ok: boolean; at: number }>();

function envGateways(): Gateway[] {
  const or = getKey("OPENROUTER_API_KEY"),
    groq = getKey("GROQ_API_KEY");
  const gemPro = getKey("GEMINI_PRO_API_KEY"),
    gem = getKey("GEMINI_API_KEY");
  const llama = getKey("LLAMA_API_KEY"),
    lov = process.env["LOVABLE_API_KEY"];
  const GEM = "https://generativelanguage.googleapis.com/v1beta/openai";
  const g: Gateway[] = [];
  if (gemPro || gem)
    g.push({
      id: "env:gemini-pro",
      name: "Gemini Pro",
      model: "gemini-pro-latest",
      baseUrl: GEM,
      key: (gemPro || gem)!,
      json: true,
      priority: 10,
      source: "env",
    });
  if (gem || gemPro)
    g.push({
      id: "env:gemini-flash",
      name: "Gemini Flash",
      model: "gemini-flash-latest",
      baseUrl: GEM,
      key: (gem || gemPro)!,
      json: true,
      priority: 20,
      source: "env",
    });
  if (groq)
    g.push({
      id: "env:groq",
      name: "Groq Llama 3.3 70B",
      model: "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1",
      key: groq,
      json: true,
      priority: 30,
      source: "env",
    });
  if (llama)
    g.push({
      id: "env:llama4",
      name: "Meta Llama 4 Maverick",
      model: "Llama-4-Maverick-17B-128E-Instruct-FP8",
      baseUrl: "https://api.llama.com/compat/v1",
      key: llama,
      json: true,
      priority: 40,
      source: "env",
    });
  if (or)
    g.push({
      id: "env:deepseek",
      name: "OpenRouter DeepSeek",
      model: "deepseek/deepseek-v4-flash",
      baseUrl: "https://openrouter.ai/api/v1",
      key: or,
      json: true,
      priority: 50,
      source: "env",
    });
  if (lov)
    g.push({
      id: "env:lovable",
      name: "Lovable AI (dự phòng)",
      model: "google/gemini-3-flash-preview",
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      key: lov,
      json: true,
      priority: 90,
      source: "env",
    });
  return g;
}

/** Cổng AI đang khả dụng = env + bảng ai_api_gateways (enabled), loại cổng đang lỗi trong 10 phút gần nhất. */
/** Khóa cho dịch vụ đặc thù (Whisper, embedding): ưu tiên biến môi trường, không có thì lấy từ cổng AI cùng nhà cung cấp trong ai_api_gateways. */
export async function keyFor(envName: string, hostPattern: RegExp): Promise<string | undefined> {
  const env = getKey(envName);
  if (env) return env;
  try {
    const sb = await admin();
    const { data } = await sb
      .from("ai_api_gateways")
      .select("api_key,base_url,enabled")
      .eq("enabled", true)
      .order("priority");
    const row = ((data ?? []) as { api_key: string; base_url: string }[]).find(
      (r) => hostPattern.test(r.base_url) && r.api_key?.trim(),
    );
    return row?.api_key;
  } catch {
    return undefined;
  }
}

export async function loadGateways(): Promise<Gateway[]> {
  const now = Date.now();
  const env = envGateways().filter((g) => {
    const h = envHealth.get(g.id);
    return !h || h.ok || now - h.at > COOLDOWN_MS;
  });
  let db: Gateway[] = [];
  try {
    const sb = await admin();
    const { data } = await sb
      .from("ai_api_gateways")
      .select(
        "id,name,model_id,base_url,api_key,supports_json,priority,enabled,is_healthy,last_checked",
      )
      .eq("enabled", true)
      .order("priority");
    db = ((data ?? []) as Record<string, unknown>[])
      .filter(
        (r) =>
          r["is_healthy"] === true ||
          !r["last_checked"] ||
          now - new Date(String(r["last_checked"])).getTime() > COOLDOWN_MS,
      )
      .filter((r) => String(r["api_key"] ?? "").trim())
      .map((r) => ({
        id: `db:${r["id"]}`,
        name: String(r["name"]),
        model: String(r["model_id"]),
        baseUrl: String(r["base_url"]).replace(/\/+$/, ""),
        key: String(r["api_key"]),
        json: r["supports_json"] !== false,
        priority: Number(r["priority"] ?? 100),
        source: "db" as const,
      }));
  } catch (e) {
    console.warn("[core] không đọc được ai_api_gateways", e);
  }
  const seen = new Set<string>();
  return [...db, ...env]
    .filter((g) => (seen.has(g.name) ? false : (seen.add(g.name), true)))
    .sort((a, b) => a.priority - b.priority);
}

async function markHealth(g: Gateway, ok: boolean, status?: number, err?: string) {
  if (g.source === "env") {
    envHealth.set(g.id, { ok, at: Date.now() });
    return;
  }
  try {
    const sb = await admin();
    const id = g.id.slice(3);
    if (ok)
      await sb
        .from("ai_api_gateways")
        .update({
          is_healthy: true,
          fail_count: 0,
          last_error: null,
          last_status: status ?? 200,
          last_checked: new Date().toISOString(),
        })
        .eq("id", id);
    else {
      const { data } = await sb.from("ai_api_gateways").select("fail_count").eq("id", id).single();
      await sb
        .from("ai_api_gateways")
        .update({
          is_healthy: false,
          fail_count: Number((data as { fail_count?: number } | null)?.fail_count ?? 0) + 1,
          last_error: clip(err ?? "", 300),
          last_status: status ?? 0,
          last_checked: new Date().toISOString(),
        })
        .eq("id", id);
    }
  } catch {
    /* không chặn luồng chính */
  }
}

export type CallOpts = {
  system: string;
  messages: Msg[];
  json?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
};

/** Gọi 1 cổng AI (OpenAI-compatible, không stream). Ném GatewayError để failover. */
export async function callGateway(g: Gateway, o: CallOpts): Promise<string> {
  const sys =
    o.json && !g.json
      ? `${o.system}\nCHỈ xuất một đối tượng JSON hợp lệ, không thêm chữ nào khác.`
      : o.system;
  const body: Record<string, unknown> = {
    model: g.model,
    stream: false,
    temperature: o.temperature ?? 0.3,
    max_tokens: o.maxTokens ?? 4000,
    messages: [{ role: "system", content: sys }, ...o.messages],
  };
  if (o.json && g.json) body["response_format"] = { type: "json_object" };
  let res: Response;
  try {
    res = await fetch(`${g.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(o.timeoutMs ?? DEFAULT_TIMEOUT),
      headers: {
        Authorization: `Bearer ${g.key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jetbu.ai",
        "X-Title": "JETBU AI",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network";
    await markHealth(g, false, 0, msg);
    throw new GatewayError(g.name, 0, `${g.name}: ${msg}`);
  }
  if (!res.ok) {
    const t = clip(await res.text().catch(() => ""), 300);
    await markHealth(g, false, res.status, t);
    throw new GatewayError(g.name, res.status, `${g.name} HTTP ${res.status}: ${t}`);
  }
  const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const c = j.choices?.[0]?.message?.content;
  const text =
    typeof c === "string"
      ? c
      : Array.isArray(c)
        ? c.map((p: { text?: string }) => p.text ?? "").join("")
        : "";
  if (!text.trim()) {
    await markHealth(g, false, 204, "Phản hồi rỗng");
    throw new GatewayError(g.name, 204, `${g.name}: phản hồi rỗng`);
  }
  await markHealth(g, true, res.status);
  return stripThink(text);
}

/** Thử lần lượt theo ưu tiên, cổng nào lỗi/hết hạn mức thì bỏ qua ngay cho cổng kế tiếp. */
export async function askFirst(
  o: CallOpts,
  pool?: Gateway[],
): Promise<{ text: string; gateway: Gateway }> {
  const chain = pool ?? (await loadGateways());
  if (!chain.length) throw new Error("Chưa có cổng AI nào hoạt động — thêm AI ở Nhánh 1.");
  const errors: string[] = [];
  for (const g of chain) {
    try {
      return { text: await callGateway(g, o), gateway: g };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      console.warn("[core] failover:", errors.at(-1));
    }
  }
  throw new Error(`Tất cả cổng AI đều lỗi: ${errors.join(" | ")}`);
}

/** Hỏi TẤT CẢ cổng AI đang hoạt động song song (tối đa `max`), giữ cổng trả lời được. */
export async function askAll(
  o: CallOpts,
  opts?: { max?: number | undefined; pool?: Gateway[] | undefined },
): Promise<{ text: string; gateway: Gateway }[]> {
  const chain = (opts?.pool ?? (await loadGateways())).slice(0, opts?.max ?? 6);
  const r = await Promise.allSettled(
    chain.map(async (g) => ({ text: await callGateway(g, o), gateway: g })),
  );
  const ok = r.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []));
  if (!ok.length) throw new Error("Không cổng AI nào phản hồi — kiểm tra khóa ở Nhánh 1.");
  return ok;
}

export function parseJson<T>(raw: string): T | null {
  const s = raw.replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"),
    b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}

/** Kiểm tra nhanh 1 cổng (dùng khi Admin bấm [Kiểm tra] ở Nhánh 1). */
export async function probeGateway(
  g: Gateway,
): Promise<{ ok: boolean; status: number; detail: string; ms: number }> {
  const t0 = Date.now();
  try {
    const text = await callGateway(g, {
      system: "Trả lời đúng 1 từ: OK",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 5,
      timeoutMs: 20_000,
    });
    return { ok: true, status: 200, detail: clip(text, 40), ms: Date.now() - t0 };
  } catch (e) {
    const ge = e as GatewayError;
    return {
      ok: false,
      status: ge.status ?? 0,
      detail: clip(ge.message ?? String(e), 200),
      ms: Date.now() - t0,
    };
  }
}

/* ============================================================================================
 * 2. TẦNG 1 — KHO TRI THỨC NỘI BỘ (.md + pgvector)
 * ========================================================================================== */
/** Embedding Gemini 1536 chiều (tùy chọn). Không có khóa hoặc lỗi → null, FTS vẫn chạy. */
export async function embed(text: string): Promise<number[] | null> {
  const key =
    (await keyFor("GEMINI_API_KEY", /generativelanguage\.googleapis\.com/)) ||
    getKey("GEMINI_PRO_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/embeddings", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-embedding-001",
        input: clip(text, 8000),
        dimensions: 1536,
      }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { embedding?: number[] }[] };
    const v = j.data?.[0]?.embedding;
    return Array.isArray(v) && v.length === 1536 ? v : null;
  } catch {
    return null;
  }
}

type ChunkRow = {
  chunk_id: string;
  doc_id: string;
  title: string;
  file_name: string;
  category: string;
  heading: string | null;
  content: string;
  score: number;
};

/** Tầng 1: tìm theo đoạn (knowledge_md_chunks), gom theo tài liệu. */
export async function tier1Search(
  q: string,
  company = COMPANY_DEFAULT,
  category?: string,
  limit = 8,
): Promise<InternalHit[]> {
  let sb: Awaited<ReturnType<typeof admin>>;
  try {
    sb = await admin();
  } catch (e) {
    console.warn("[core] tier1: chưa kết nối Supabase", e);
    return [];
  }
  const vec = await embed(q);
  const { data, error } = await sb.rpc("search_knowledge_chunks", {
    q,
    p_company: company,
    p_category: category ?? null,
    p_limit: Math.min(limit * 3, 60),
    query_embedding: vec,
  });
  if (error) {
    console.warn("[core] tier1", error.message);
    return [];
  }
  const groups = new Map<string, { hit: InternalHit; parts: string[] }>();
  for (const r of (data ?? []) as ChunkRow[]) {
    const g = groups.get(r.doc_id);
    const part = r.heading ? `## ${r.heading}\n${r.content}` : r.content;
    if (g) {
      g.hit.score += Number(r.score) || 0;
      g.hit.chunks = (g.hit.chunks ?? 0) + 1;
      g.parts.push(part);
    } else {
      groups.set(r.doc_id, {
        hit: {
          id: r.doc_id,
          category: r.category,
          title: r.title,
          file_name: r.file_name,
          snippet: clip(r.content, 300),
          content_md: "",
          source_url: null,
          source_name: null,
          score: Number(r.score) || 0,
          chunks: 1,
        },
        parts: [part],
      });
    }
  }
  return [...groups.values()]
    .map((g) => ({ ...g.hit, content_md: clip(g.parts.join("\n…\n"), 6000) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type KhoTitle = {
  id: string;
  title: string;
  file_name: string;
  category: string;
  word_count: number | null;
  tags: string[];
};
export async function listKhoTitles(company = COMPANY_DEFAULT): Promise<KhoTitle[]> {
  const sb = await admin();
  const { data, error } = await sb.rpc("knowledge_md_titles", { p_company: company });
  if (error) throw new Error(`Không đọc được danh mục Kho: ${error.message}`);
  return (data ?? []) as KhoTitle[];
}

/** Lấy 10 đoạn đầu + các đoạn khớp đề tài của sách Admin chọn (≤8000 ký tự/sách). */
async function pickedDocsEvidence(docIds: string[], topic: string) {
  const sb = await admin();
  const words = new Set(
    topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3),
  );
  const out: { file_name: string; title: string; chunks: number; text: string }[] = [];
  for (const id of docIds.slice(0, 10)) {
    const { data: doc } = await sb
      .from("knowledge_md_store")
      .select("title,file_name")
      .eq("id", id)
      .maybeSingle();
    if (!doc) continue;
    const { data: rows } = await sb
      .from("knowledge_md_chunks")
      .select("chunk_index,heading,content")
      .eq("doc_id", id)
      .order("chunk_index")
      .limit(400);
    const list = (rows ?? []) as { chunk_index: number; heading: string | null; content: string }[];
    const picked = list.filter((c, i) => {
      if (i < 10) return true;
      const n = c.content
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      for (const w of words) if (n.includes(w)) return true;
      return false;
    });
    const d = doc as { title: string; file_name: string };
    out.push({
      file_name: d.file_name,
      title: d.title,
      chunks: picked.length,
      text: clip(
        picked.map((c) => (c.heading ? `## ${c.heading}\n${c.content}` : c.content)).join("\n…\n"),
        8000,
      ),
    });
  }
  return out;
}

/** Lưu 1 file .md vào Kho (chống trùng theo source_url; trùng → trả về bản đã có). */
export async function saveMd(doc: {
  company_code?: string;
  category: string;
  title: string;
  content_md: string;
  source_type?: string;
  source_url?: string | null;
  source_name?: string | null;
  tags?: string[];
  verified_by?: string[];
}) {
  const sb = await admin();
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const slug =
    doc.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "tai_lieu";
  const row = {
    company_code: doc.company_code ?? COMPANY_DEFAULT,
    category: doc.category,
    title: clip(doc.title, 300),
    file_name: `${day}_${slug}.md`,
    content_md: doc.content_md,
    source_type: doc.source_type ?? "upload",
    source_url: doc.source_url ?? null,
    source_name: doc.source_name ?? null,
    tags: doc.tags ?? [doc.category],
    verified_by: doc.verified_by ?? [],
    embedding: await embed(`${doc.title}\n${doc.content_md}`),
  };
  if (row.source_url) {
    const { data: ex } = await sb
      .from("knowledge_md_store")
      .select("id,file_name,title")
      .eq("company_code", row.company_code)
      .eq("source_url", row.source_url)
      .maybeSingle();
    if (ex) return { ...(ex as { id: string; file_name: string; title: string }), duplicate: true };
  }
  const { data, error } = await sb
    .from("knowledge_md_store")
    .insert(row)
    .select("id,file_name,title")
    .single();
  if (error) throw new Error(`Không lưu được vào Kho: ${error.message}`);
  return { ...(data as { id: string; file_name: string; title: string }), duplicate: false };
}

/* ============================================================================================
 * 3. TẦNG 2 — NGUỒN TRI THỨC MỞ BÊN NGOÀI
 * ========================================================================================== */
const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
async function getJson(url: string, init?: RequestInit, ms = 10_000): Promise<unknown> {
  const r = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(ms),
    headers: {
      "User-Agent": "JETBU-AI/2.0 (bhnhat168@gmail.com)",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`${new URL(url).host} HTTP ${r.status}`);
  return r.json();
}
async function getText(url: string, ms = 12_000): Promise<string> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: { "User-Agent": "JETBU-AI/2.0 (bhnhat168@gmail.com)" },
  });
  if (!r.ok) throw new Error(`${new URL(url).host} HTTP ${r.status}`);
  return r.text();
}
const abstractFromInverted = (inv: Record<string, number[]> | null | undefined) => {
  if (!inv) return "";
  const words: string[] = [];
  for (const [w, pos] of Object.entries(inv)) for (const p of pos) words[p] = w;
  return words.join(" ").trim();
};

export const SOURCE_IDS = [
  "openalex",
  "wikidata",
  "arxiv",
  "archive",
  "huggingface",
  "suttacentral",
  "cbeta",
  "sefaria",
  "ctext",
  "gdelt",
] as const;
export type SourceId = (typeof SOURCE_IDS)[number];
export const SOURCE_LABELS: Record<SourceId, string> = {
  openalex: "OpenAlex (học thuật)",
  wikidata: "Wikidata",
  arxiv: "arXiv",
  archive: "Archive.org",
  huggingface: "Hugging Face (datasets)",
  suttacentral: "SuttaCentral (Tam Tạng Pāli)",
  cbeta: "CBETA (Đại Tạng Kinh)",
  sefaria: "Sefaria",
  ctext: "CTEXT (Hán học)",
  gdelt: "GDELT (tin tức toàn cầu)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
export async function searchSource(source: SourceId, q: string, limit = 6): Promise<ExternalHit[]> {
  const e = encodeURIComponent(q);
  switch (source) {
    case "openalex": {
      const d = (await getJson(
        `https://api.openalex.org/works?search=${e}&per-page=${limit}&mailto=bhnhat168@gmail.com`,
      )) as Any;
      return (d.results ?? []).map((w: Any) => ({
        source,
        title: w.display_name ?? w.title ?? "",
        excerpt: clip(abstractFromInverted(w.abstract_inverted_index), 1200),
        url: w.doi ?? w.id ?? "",
        citation: `${(w.authorships ?? [])
          .slice(0, 3)
          .map((a: Any) => a.author?.display_name)
          .filter(Boolean)
          .join(
            ", ",
          )} (${w.publication_year ?? "?"}). ${w.display_name ?? ""}. ${w.primary_location?.source?.display_name ?? "OpenAlex"}.`,
        extra: { year: w.publication_year, cited_by: w.cited_by_count },
      }));
    }
    case "wikidata": {
      const d = (await getJson(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${e}&language=vi&uselang=vi&format=json&limit=${limit}&origin=*`,
      )) as Any;
      return (d.search ?? []).map((h: Any) => ({
        source,
        title: h.label ?? h.id,
        excerpt: h.description ?? "",
        url: `https://www.wikidata.org/wiki/${h.id}`,
        citation: `Wikidata ${h.id}`,
      }));
    }
    case "arxiv": {
      const xml = await getText(
        `https://export.arxiv.org/api/query?search_query=all:${e}&start=0&max_results=${limit}`,
      );
      const entries = xml.split("<entry>").slice(1);
      return entries.map((en) => {
        const pick = (tag: string) =>
          strip((en.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) ?? [])[1] ?? "");
        const id = pick("id");
        return {
          source,
          title: pick("title"),
          excerpt: clip(pick("summary"), 1200),
          url: id,
          citation: `arXiv ${id.split("/abs/")[1] ?? id} — ${pick("published").slice(0, 10)}`,
        };
      });
    }
    case "archive": {
      const d = (await getJson(
        `https://archive.org/advancedsearch.php?q=${e}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=creator&fl[]=year&rows=${limit}&output=json`,
      )) as Any;
      return (d.response?.docs ?? []).map((x: Any) => ({
        source,
        title: String(x.title ?? x.identifier),
        excerpt: clip(
          strip(
            Array.isArray(x.description) ? x.description.join(" ") : String(x.description ?? ""),
          ),
          1200,
        ),
        url: `https://archive.org/details/${x.identifier}`,
        citation: `Archive.org ${x.identifier}${x.creator ? ` — ${Array.isArray(x.creator) ? x.creator[0] : x.creator}` : ""}${x.year ? ` (${x.year})` : ""}`,
      }));
    }
    case "huggingface": {
      const hf = getKey("HF_TOKEN");
      const d = (await getJson(
        `https://huggingface.co/api/datasets?search=${e}&limit=${limit}&full=false`,
        hf ? { headers: { Authorization: `Bearer ${hf}` } } : undefined,
      )) as Any[];
      return (d ?? []).map((x: Any) => ({
        source,
        title: x.id,
        excerpt: `Lượt tải: ${x.downloads ?? 0} · Thích: ${x.likes ?? 0} · Thẻ: ${(x.tags ?? []).slice(0, 8).join(", ")}`,
        url: `https://huggingface.co/datasets/${x.id}`,
        citation: `Hugging Face dataset ${x.id}`,
      }));
    }
    case "suttacentral": {
      const d = (await getJson(
        `https://suttacentral.net/api/search/instant?query=${e}&lang=en&limit=${limit}`,
      )) as Any;
      return (d.hits ?? []).slice(0, limit).map((h: Any) => ({
        source,
        title: `${h.acronym ?? ""} ${h.name ?? h.heading?.title ?? ""}`.trim(),
        excerpt: strip((h.highlight?.content ?? []).join(" … ")) || h.root_name || "",
        url: `https://suttacentral.net${h.url ?? `/${h.uid}`}`,
        citation: `SuttaCentral ${h.acronym ?? h.uid}${h.author ? `, bản dịch ${h.author}` : ""}`,
        extra: { uid: h.uid, author_uid: h.author_uid },
      }));
    }
    case "cbeta": {
      // CBETA API (DILA). Cấu trúc kết quả có thể thay đổi theo phiên bản → đọc phòng thủ.
      const d = (await getJson(
        `https://cbdata.dila.edu.tw/stable/sphinx?q=${e}&rows=${limit}`,
      )) as Any;
      const rows: Any[] = d.results ?? d.hits ?? d.data ?? [];
      return rows.slice(0, limit).map((h: Any) => ({
        source,
        title: `${h.work ?? h.id ?? ""} ${h.title ?? h.work_title ?? ""}`.trim(),
        excerpt: clip(strip(String(h.highlight ?? h.text ?? h.content ?? "")), 1200),
        url: h.work
          ? `https://cbetaonline.dila.edu.tw/${encodeURIComponent(h.work)}`
          : "https://cbetaonline.dila.edu.tw",
        citation: `CBETA ${h.work ?? ""}${h.juan ? ` quyển ${h.juan}` : ""}`,
      }));
    }
    case "sefaria": {
      const d = (await getJson("https://www.sefaria.org/api/search-wrapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, type: "text", size: limit }),
      })) as Any;
      return (d.hits?.hits ?? []).map((h: Any) => {
        const ref = String(h._source?.ref ?? h._id).replace(/\s*\(.*\)\s*$/, "");
        return {
          source,
          title: ref,
          excerpt: strip((h.highlight?.exact ?? h.highlight?.naive_lemmatizer ?? []).join(" … ")),
          url: `https://www.sefaria.org/${encodeURIComponent(ref.replace(/ /g, "_"))}`,
          citation: `Sefaria — ${ref}`,
        };
      });
    }
    case "ctext": {
      const d = (await getJson(`https://api.ctext.org/searchtexts?title=${e}`)) as Any;
      return (d.books ?? []).slice(0, limit).map((b: Any) => ({
        source,
        title: b.title ?? b.urn,
        excerpt: b.description ?? "",
        url: `https://ctext.org/${String(b.urn ?? "").replace(/^ctp:/, "")}`,
        citation: `CTEXT ${b.urn}`,
      }));
    }
    case "gdelt": {
      const d = (await getJson(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${e}&mode=artlist&maxrecords=${Math.min(limit, 25)}&format=json&timespan=48h&sort=hybridrel`,
        undefined,
        15_000,
      )) as Any;
      return (d.articles ?? []).map((a: Any) => ({
        source,
        title: a.title ?? "",
        excerpt: `${a.domain ?? ""} · ${a.sourcecountry ?? ""} · ${a.seendate ?? ""}`,
        url: a.url ?? "",
        citation: `${a.domain ?? "GDELT"} — ${String(a.seendate ?? "").slice(0, 8)}`,
        extra: { language: a.language, seendate: a.seendate },
      }));
    }
  }
}

/** Tìm nhiều nguồn song song; nguồn nào lỗi/chậm thì bỏ qua, không chặn nguồn khác. */
export async function tier2Search(
  q: string,
  sources: readonly SourceId[] = ["openalex", "wikidata", "arxiv", "archive", "gdelt"],
  perSource = 5,
): Promise<{ hits: ExternalHit[]; failed: string[] }> {
  const r = await Promise.allSettled(sources.map((s) => searchSource(s, q, perSource)));
  const hits: ExternalHit[] = [],
    failed: string[] = [];
  r.forEach((x, i) =>
    x.status === "fulfilled"
      ? hits.push(...x.value)
      : failed.push(`${sources[i]}: ${x.reason instanceof Error ? x.reason.message : "lỗi"}`),
  );
  return { hits: hits.filter((h) => h.title && h.url), failed };
}

/** Gợi ý nguồn theo từ khóa (VD "Kinh Phật" → SuttaCentral, CBETA, Archive.org...). */
export function suggestSources(q: string): SourceId[] {
  const n = q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const pick = new Set<SourceId>();
  if (/kinh|phat|buddh|sutta|nikaya|pali|thien|zen|dharma|phap/.test(n))
    ["suttacentral", "cbeta", "archive"].forEach((s) => pick.add(s as SourceId));
  if (/torah|talmud|do thai|jew|hebrew|kinh thanh|bible/.test(n))
    ["sefaria", "archive"].forEach((s) => pick.add(s as SourceId));
  if (/dao|lao tu|khong tu|kinh dich|i ching|confuc|tao|han/.test(n))
    ["ctext", "archive"].forEach((s) => pick.add(s as SourceId));
  if (
    /tin tuc|news|thi truong|market|vang|gold|usd|crypto|bitcoin|chung khoan|stock|chinh tri/.test(
      n,
    )
  )
    pick.add("gdelt");
  if (/dataset|du lieu|model|huan luyen|ai|machine/.test(n)) pick.add("huggingface");
  ["openalex", "arxiv", "wikidata"].forEach((s) => pick.add(s as SourceId));
  return [...pick];
}

/** Lấy nội dung đầy đủ nhất có thể của 1 kết quả và xuất thành file .md siêu nhẹ. */
export async function hitToMarkdown(
  hit: ExternalHit,
): Promise<{ title: string; content_md: string }> {
  let body = hit.excerpt;
  try {
    if (hit.source === "suttacentral" && hit.extra?.["uid"]) {
      const uid = String(hit.extra["uid"]),
        au = String(hit.extra["author_uid"] ?? "sujato");
      const d = (await getJson(
        `https://suttacentral.net/api/bilarasuttas/${uid}/${au}?lang=en`,
      )) as Any;
      const segs = d.translation_text ?? d.root_text ?? {};
      body =
        Object.values(segs as Record<string, string>)
          .join(" ")
          .trim() || body;
    } else if (
      hit.source === "arxiv" ||
      hit.source === "openalex" ||
      hit.source === "wikidata" ||
      hit.source === "huggingface" ||
      hit.source === "sefaria" ||
      hit.source === "ctext" ||
      hit.source === "cbeta"
    ) {
      body = hit.excerpt;
    } else if (/^https?:\/\//.test(hit.url)) {
      body = htmlToMd(await getText(hit.url, 15_000));
    }
  } catch {
    /* giữ excerpt */
  }
  const md = `# ${hit.title}\n\n- **Nguồn:** ${SOURCE_LABELS[hit.source as SourceId] ?? hit.source}\n- **Trích dẫn:** ${hit.citation}\n- **URL:** ${hit.url}\n- **Tải lúc:** ${new Date().toISOString()}\n\n---\n\n${clip(body, 60_000)}\n`;
  return { title: hit.title, content_md: md };
}

/** HTML → markdown nhẹ (không thư viện ngoài). */
export function htmlToMd(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");
  const m = h.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
  if (m?.[2]) h = m[2];
  h = h
    .replace(
      /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
      (_, l, t) => `\n${"#".repeat(Number(l))} ${strip(t)}\n`,
    )
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${strip(t)}`)
    .replace(/<(p|div|br|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return h
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/* ============================================================================================
 * 4. TẦNG 3 — HỘI ĐỒNG AI ĐỐI CHIẾU CHÉO (Cross-Verification)
 * ========================================================================================== */
type Verdict = {
  index: number;
  verdict: "xac_thuc" | "nghi_ngo" | "bac_bo";
  reason: string;
  confidence: number;
};

/** Mỗi AI chấm từng nguồn ngoài; chỉ giữ nguồn được ĐA SỐ AI xác thực (1 AI thì cần confidence ≥ 0.7). */
export async function tier3Verify(question: string, hits: ExternalHit[], pool?: Gateway[]) {
  if (!hits.length)
    return {
      verified: [] as ExternalHit[],
      rejected: [] as { title: string; url: string; reason: string }[],
      verified_by: [] as string[],
    };
  const list = hits
    .slice(0, 15)
    .map(
      (h, i) =>
        `[${i}] (${h.source}) ${h.title}\nTrích dẫn: ${h.citation}\nURL: ${h.url}\nNội dung: ${clip(h.excerpt, 700)}`,
    )
    .join("\n\n");
  const system = `Bạn là thành viên Hội đồng Kiểm chứng JETBU AI. Nhiệm vụ: đánh giá từng nguồn bên ngoài có đáng tin và có LIÊN QUAN TRỰC TIẾP để trả lời câu hỏi không.
Tiêu chí: nguồn gốc rõ ràng (tạp chí, cơ quan, kinh điển gốc), nội dung nhất quán, không mâu thuẫn với kiến thức đã được xác lập, không phải tin giả/suy đoán.
CHỈ xuất JSON: {"verdicts":[{"index":0,"verdict":"xac_thuc|nghi_ngo|bac_bo","reason":"1 câu tiếng Việt","confidence":0-1}]}`;
  const res = await askAll(
    {
      system,
      json: true,
      maxTokens: 2500,
      temperature: 0.1,
      messages: [{ role: "user", content: `Câu hỏi: ${question}\n\nCác nguồn:\n${list}` }],
    },
    { pool },
  );
  const votes = new Map<number, { ok: number; total: number; reasons: string[]; conf: number }>();
  for (const r of res) {
    const j = parseJson<{ verdicts: Verdict[] }>(r.text);
    for (const v of j?.verdicts ?? []) {
      const cur = votes.get(v.index) ?? { ok: 0, total: 0, reasons: [], conf: 0 };
      cur.total++;
      if (v.verdict === "xac_thuc") {
        cur.ok++;
        cur.conf = Math.max(cur.conf, Number(v.confidence ?? 0));
      } else cur.reasons.push(`${r.gateway.name}: ${v.reason}`);
      votes.set(v.index, cur);
    }
  }
  const n = res.length;
  const verified: ExternalHit[] = [],
    rejected: { title: string; url: string; reason: string }[] = [];
  hits.slice(0, 15).forEach((h, i) => {
    const v = votes.get(i);
    const pass = v ? (n >= 2 ? v.ok * 2 > v.total : v.ok > 0 && v.conf >= 0.7) : false;
    if (pass) verified.push(h);
    else
      rejected.push({
        title: h.title,
        url: h.url,
        reason: v ? (v.reasons[0] ?? "Không đủ đa số xác thực") : "Không AI nào đánh giá",
      });
  });
  return { verified, rejected, verified_by: res.map((r) => r.gateway.name) };
}

/* ============================================================================================
 * 5. 3-TIER TRUTH PROTOCOL — câu trả lời trung thực có trích dẫn
 * ========================================================================================== */
const TRUTH_RULES = `[HIẾN PHÁP TRUNG THỰC HỌC THUẬT JETBU AI]
- Tuyệt đối KHÔNG bịa đặt, KHÔNG suy diễn ngoài bằng chứng. Mỗi khẳng định phải gắn với trích dẫn: nội bộ ghi [file: tên_file.md], bên ngoài ghi [nguồn: tên — URL].
- Phân định rõ: "ĐÃ CÓ TRONG KHO TRI THỨC" (dựa trên file .md nội bộ) và "THIẾU / CHƯA CÓ CĂN CỨ".
- Nếu không đủ bằng chứng thì nói thẳng "Kho tri thức chưa có thông tin này" thay vì đoán. Trả lời tiếng Việt chuyên nghiệp, súc tích.`;

export async function truthAnswer(o: {
  question: string;
  company?: string | undefined;
  category?: string | undefined;
  persona?: string | undefined;
  history?: Msg[] | undefined;
  forceExternal?: boolean | undefined;
  sources?: readonly SourceId[] | undefined;
}): Promise<TruthAnswer> {
  const company = o.company ?? COMPANY_DEFAULT;
  const pool = await loadGateways();
  const internal = await tier1Search(o.question, company, o.category, 16);
  const ctx = internal
    .map(
      (h, i) =>
        `[NỘI BỘ ${i + 1}] file: ${h.file_name} | thư mục: ${h.category} | tiêu đề: ${h.title}\n${clip(h.content_md, 3000)}`,
    )
    .join("\n\n---\n\n");
  const persona = o.persona ?? "Bạn là JETBU AI — bộ não thứ 2 của Admin.";
  // TẦNG 1
  const t1 = await askFirst(
    {
      system: `${persona}\n${TRUTH_RULES}\nCHỈ xuất JSON: {"answer_md":"câu trả lời markdown có trích dẫn [file: ...]","covered":["ý đã có căn cứ trong kho"],"missing":["ý còn thiếu căn cứ"],"need_external":true|false}\nneed_external=true khi kho nội bộ không đủ để trả lời trọn vẹn.`,
      json: true,
      maxTokens: 3500,
      messages: [
        ...(o.history ?? []).slice(-8),
        {
          role: "user",
          content: `KHO TRI THỨC NỘI BỘ (${internal.length} tài liệu khớp):\n${ctx || "(không có tài liệu nào khớp)"}\n\nCÂU HỎI: ${o.question}`,
        },
      ],
    },
    pool,
  );
  const j1 = parseJson<{
    answer_md: string;
    covered: string[];
    missing: string[];
    need_external: boolean;
  }>(t1.text);
  const base: TruthAnswer = {
    answer_md: j1?.answer_md ?? t1.text,
    tier_used: 1,
    covered: j1?.covered ?? [],
    missing: j1?.missing ?? [],
    citations: internal.map((h) => ({
      kind: "internal" as const,
      title: h.title,
      ref: h.file_name,
      source: h.category,
    })),
    verified_by: [],
    rejected: [],
    ai_name: t1.gateway.name,
  };
  const needExt = o.forceExternal || !internal.length || j1?.need_external !== false;
  if (!needExt) return base;
  // TẦNG 2
  const { hits, failed } = await tier2Search(o.question, o.sources ?? suggestSources(o.question));
  if (!hits.length)
    return {
      ...base,
      answer_md: `${base.answer_md}\n\n> ⚠️ Đã tìm nguồn mở bên ngoài nhưng không có kết quả phù hợp${failed.length ? ` (nguồn lỗi: ${failed.join("; ")})` : ""}. Phần còn thiếu vẫn CHƯA CÓ CĂN CỨ.`,
      tier_used: 2,
    };
  // TẦNG 3
  const v = await tier3Verify(o.question, hits, pool);
  const ext = v.verified
    .map((h, i) => `[NGOÀI ${i + 1}] ${h.citation} — ${h.url}\n${clip(h.excerpt, 1500)}`)
    .join("\n\n---\n\n");
  const t3 = await askFirst(
    {
      system: `${persona}\n${TRUTH_RULES}\nTổng hợp câu trả lời cuối cùng. Ưu tiên kho nội bộ; chỉ bổ sung từ nguồn ngoài ĐÃ ĐƯỢC HỘI ĐỒNG XÁC THỰC bên dưới. Kết thúc bằng mục "### Căn cứ" liệt kê file nội bộ và URL ngoài đã dùng, và mục "### Còn thiếu" nếu có.\nCHỈ xuất JSON: {"answer_md":"...","covered":[...],"missing":[...]}`,
      json: true,
      maxTokens: 4000,
      messages: [
        {
          role: "user",
          content: `KHO NỘI BỘ:\n${ctx || "(trống)"}\n\nNGUỒN NGOÀI ĐÃ KIỂM CHỨNG bởi ${v.verified_by.join(", ") || "—"}:\n${ext || "(không nguồn nào vượt qua kiểm chứng)"}\n\nCÂU HỎI: ${o.question}`,
        },
      ],
    },
    pool,
  );
  const j3 = parseJson<{ answer_md: string; covered: string[]; missing: string[] }>(t3.text);
  return {
    answer_md: j3?.answer_md ?? t3.text,
    tier_used: 3,
    covered: j3?.covered ?? base.covered,
    missing: j3?.missing ?? base.missing,
    citations: [
      ...base.citations,
      ...v.verified.map((h) => ({
        kind: "external" as const,
        title: h.title,
        ref: h.url,
        source: h.source,
      })),
    ],
    verified_by: v.verified_by,
    rejected: v.rejected,
    ai_name: t3.gateway.name,
  };
}

/* ============================================================================================
 * 6. HỘI ĐỒNG AI "LỤC ĐẠO LUÂN HỒI" — nghiên cứu & viết sách tiếng Việt
 * ========================================================================================== */
export const LUC_DAO = [
  "Sinh thái",
  "Giáo dục",
  "Năng lượng",
  "Hạ tầng",
  "Kinh tế số",
  "Xã hội",
] as const;
export const ENTERPRISES = [
  "Nhật Quân",
  "Winadata",
  "AgreenBOT",
  "Mai Linh Bình Dương",
  "Emailinh",
  "Ninh Kiều Go",
  "Viện Blockchain & Pháp lý",
] as const;
const PERSONAS = [
  "Chuyên gia Tài chính Định lượng & Dòng vốn (OCF, WACC vs ROIC, 3 kịch bản có xác suất)",
  "Chuyên gia Khoa học Cứng, Kỹ thuật & Năng lượng (số liệu vật lý, hiệu suất, chi phí/kWh)",
  "Chuyên gia Lịch sử Định lượng, Chu kỳ & Địa chính trị",
  "Chuyên gia Lý thuyết Trò chơi, Chiến lược & Tâm lý Thần kinh (BATNA, Nash)",
  "Chuyên gia Văn hóa, Pháp lý Việt Nam/Quốc tế & Nhân khẩu học",
];

export type CouncilProgress = { step: string; detail?: string };
export async function councilBook(o: {
  topic: string;
  company?: string | undefined;
  origin?: "admin" | "neural_graph" | undefined;
  enterprises?: string[] | undefined;
  cycle?: number | undefined;
  onProgress?: ((p: CouncilProgress) => void) | undefined;
  doc_ids?: string[] | undefined;
}) {
  const company = o.company ?? COMPANY_DEFAULT;
  const ents = o.enterprises?.length ? o.enterprises : [...ENTERPRISES];
  const pool = await loadGateways();
  if (!pool.length) throw new Error("Chưa có cổng AI nào hoạt động — thêm AI ở Nhánh 1.");
  const prog = o.onProgress ?? (() => {});

  prog({ step: "Tầng 1: tra Kho Tri Thức nội bộ" });
  const picked = o.doc_ids?.length ? await pickedDocsEvidence(o.doc_ids, o.topic) : [];
  const internal = await tier1Search(o.topic, company, undefined, 24);
  const titles = await listKhoTitles(company).catch(() => [] as KhoTitle[]);
  const pickedTxt = picked.map((p) => `[file: ${p.file_name}] ${p.title}\n${p.text}`).join("\n\n");
  const ctx = internal
    .map((h) => `[file: ${h.file_name}] ${h.title}\n${clip(h.content_md, 2500)}`)
    .join("\n\n");
  const catalog = titles
    .slice(0, 150)
    .map((t) => `- ${t.title} [file: ${t.file_name}]`)
    .join("\n");
  const srcMap = new Map<string, { file_name: string; title: string; chunks: number }>();
  for (const p of picked)
    srcMap.set(p.file_name, { file_name: p.file_name, title: p.title, chunks: p.chunks });
  for (const h of internal) {
    const ex = srcMap.get(h.file_name);
    if (ex) ex.chunks += h.chunks ?? 0;
    else srcMap.set(h.file_name, { file_name: h.file_name, title: h.title, chunks: h.chunks ?? 0 });
  }
  const sources_internal = [...srcMap.values()];
  prog({ step: "Tầng 2+3: nguồn mở & kiểm chứng chéo" });
  const { hits } = await tier2Search(o.topic, suggestSources(o.topic), 4);
  const ver = await tier3Verify(o.topic, hits, pool);
  const ext = ver.verified
    .map((h) => `[nguồn: ${h.citation} — ${h.url}] ${clip(h.excerpt, 900)}`)
    .join("\n\n");
  const evidence = `${pickedTxt ? `BẰNG CHỨNG BẮT BUỘC (sách Admin chọn):\n${pickedTxt}\n\n` : ""}BẰNG CHỨNG NỘI BỘ:\n${ctx || "(trống)"}\n\nDANH MỤC KHO:\n${catalog || "(trống)"}\n\nBẰNG CHỨNG NGOÀI ĐÃ KIỂM CHỨNG:\n${ext || "(không có)"}\n\nQUY TẮC TRÍCH DẪN: mọi luận điểm lấy từ Kho phải ghi [file: tên_file].`;

  // VÒNG 1 — mỗi AI một vai chuyên gia, phân tích xoay quanh 6 cõi
  prog({
    step: `Vòng 1: ${pool.length} AI phân tích 6 cõi Lục Đạo`,
    detail: pool.map((g) => g.name).join(", "),
  });
  const round1 = await Promise.allSettled(
    pool.slice(0, 6).map(async (g, i) => {
      const persona = PERSONAS[i % PERSONAS.length]!;
      const text = await callGateway(g, {
        system: `Bạn là ${persona} trong Hội đồng Lục Đạo Luân Hồi của JETBU AI.\n${TRUTH_RULES}\nPhân tích đề tài theo đúng chu trình khép kín 6 cõi: ${LUC_DAO.join(" → ")} → quay về vòng N+1 sâu hơn. Với MỖI cõi nêu: luận điểm, số liệu/căn cứ (ghi rõ đâu là giả định), và ứng dụng thực tiễn cho từng doanh nghiệp: ${ents.join(", ")} (Ngành gì? Thông tin gì? Nội dung triển khai cụ thể?). Markdown tiếng Việt, ≤ 1200 từ.`,
        maxTokens: 3500,
        temperature: 0.4,
        messages: [
          { role: "user", content: `ĐỀ TÀI: ${o.topic}\nVÒNG: ${o.cycle ?? 1}\n\n${evidence}` },
        ],
      });
      return { ai: g.name, persona, text };
    }),
  );
  const analyses = round1.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!analyses.length) throw new Error("Không AI nào hoàn thành vòng 1.");

  // VÒNG 2 — Red Team: mỗi AI phản biện toàn bộ phân tích của AI khác
  prog({ step: "Vòng 2: Red Team phản biện chéo" });
  const bundle = analyses
    .map((a) => `=== ${a.ai} (${a.persona}) ===\n${clip(a.text, 5000)}`)
    .join("\n\n");
  const round2 = await askAll(
    {
      system: `Bạn là Red Team của Hội đồng Lục Đạo. Chỉ ra lỗi logic, số liệu không căn cứ, mâu thuẫn giữa các chuyên gia, rủi ro bỏ sót. Không khen. CHỈ xuất JSON: {"critiques":[{"target":"tên AI","issue":"vấn đề","fix":"đề xuất sửa"}],"consensus":["điểm mọi chuyên gia đồng thuận"],"disputed":["điểm còn tranh cãi"]}`,
      json: true,
      maxTokens: 2500,
      temperature: 0.2,
      messages: [{ role: "user", content: `ĐỀ TÀI: ${o.topic}\n\n${bundle}` }],
    },
    { pool },
  ).catch(() => [] as { text: string; gateway: Gateway }[]);
  const critiques = round2.map((r) => ({
    ai: r.gateway.name,
    ...(parseJson<{ critiques: unknown[]; consensus: string[]; disputed: string[] }>(r.text) ?? {
      critiques: [],
      consensus: [],
      disputed: [],
    }),
  }));

  // VÒNG 3 — Tổng hợp thành sách hoàn chỉnh (tên tiếng Việt)
  prog({ step: "Vòng 3: tổng hợp sách hoàn chỉnh" });
  const synth = await askFirst(
    {
      system: `Bạn là Tổng biên tập Hội đồng Lục Đạo Luân Hồi JETBU AI. Nội suy mọi phân tích + phản biện thành MỘT CUỐN SÁCH HOÀN CHỈNH bằng tiếng Việt, tên sách tiếng Việt súc tích, hấp dẫn.
${TRUTH_RULES}
Cấu trúc bắt buộc: Lời mở đầu → 6 chương theo 6 cõi (${LUC_DAO.join(", ")}) → Chương "Ma trận Ứng dụng Thực tiễn" (bảng: Doanh nghiệp | Ngành | Thông tin then chốt | Nội dung triển khai cụ thể | Mốc thời gian) → Chương "Vòng N+1" (câu hỏi sâu hơn cho vòng kế) → "Căn cứ & Giới hạn" (liệt kê file nội bộ, URL ngoài đã kiểm chứng, và những gì là giả định).
CHỈ xuất JSON: {"title_vi":"...","content_md":"sách markdown đầy đủ ≥ 2500 từ","realms":[{"realm":"Sinh thái","thesis":"...","evidence":"..."}...6],"applications":[{"enterprise":"...","industry":"...","info":"...","deployment":"..."}],"next_cycle_questions":["..."]}`,
      json: true,
      maxTokens: 12000,
      temperature: 0.35,
      messages: [
        {
          role: "user",
          content: `ĐỀ TÀI: ${o.topic}\nDOANH NGHIỆP: ${ents.join(", ")}\n\nPHÂN TÍCH VÒNG 1:\n${bundle}\n\nPHẢN BIỆN VÒNG 2:\n${clip(JSON.stringify(critiques), 6000)}\n\n${clip(evidence, 8000)}`,
        },
      ],
    },
    pool,
  );
  const book = parseJson<{
    title_vi: string;
    content_md: string;
    realms: unknown[];
    applications: unknown[];
    next_cycle_questions: string[];
  }>(synth.text);
  const title_vi = book?.title_vi?.trim() || `Lục Đạo Luân Hồi: ${clip(o.topic, 60)}`;
  const content_md = book?.content_md?.trim() || synth.text;

  prog({ step: "Lưu sách vào Kho" });
  const sb = await admin();
  const { data, error } = await sb
    .from("books_luc_dao")
    .insert({
      company_code: company,
      title_vi,
      topic: o.topic,
      origin: o.origin ?? "admin",
      cycle_round: o.cycle ?? 1,
      realms: book?.realms ?? [],
      applications: book?.applications ?? [],
      council_log: {
        round1: analyses.map((a) => ({ ai: a.ai, persona: a.persona, text: a.text })),
        round2: critiques,
        synthesizer: synth.gateway.name,
        external_verified_by: ver.verified_by,
        sources_internal,
        next_cycle_questions: book?.next_cycle_questions ?? [],
      },
      ai_participants: [
        ...new Set([
          ...analyses.map((a) => a.ai),
          ...critiques.map((c) => c.ai),
          synth.gateway.name,
        ]),
      ],
      content_md,
      status: "published",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Lưu sách lỗi: ${error.message}`);
  return {
    id: (data as { id: string }).id,
    title_vi,
    content_md,
    participants: analyses.map((a) => a.ai),
    sources_internal,
    synthesizer: synth.gateway.name,
    critiques,
    next_cycle_questions: book?.next_cycle_questions ?? [],
  };
}

/* ============================================================================================
 * 7. "THẾ GIỚI TRONG TAY MỖI NGÀY" & PHÁP LUẬT
 * ========================================================================================== */
export async function dailyWorldNews(company = COMPANY_DEFAULT) {
  const pool = await loadGateways();
  const queries = [
    '(gold price OR "giá vàng")',
    '("US dollar" OR DXY OR "tỷ giá")',
    "(bitcoin OR crypto OR ethereum)",
    '("stock market" OR "chứng khoán" OR "VN-Index")',
    '(geopolitics OR tariff OR "Federal Reserve" OR "lãi suất")',
  ];
  const r = await Promise.allSettled(queries.map((q) => searchSource("gdelt", q, 8)));
  const hits = r.flatMap((x) => (x.status === "fulfilled" ? x.value : []));
  const seen = new Set<string>();
  const uniq = hits.filter((h) => (seen.has(h.url) ? false : (seen.add(h.url), true))).slice(0, 25);
  const ver = await tier3Verify(
    "Nhận định thị trường Chứng khoán, Vàng, USD, Crypto hôm nay",
    uniq,
    pool,
  );
  const day = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const src = ver.verified
    .map((h, i) => `[${i + 1}] ${h.title} — ${h.citation} — ${h.url}`)
    .join("\n");
  const synth = await askFirst(
    {
      system: `Bạn là Ban biên tập "Thế Giới Trong Tay Mỗi Ngày" của JETBU AI. Viết bài báo tiếng Việt từ CHỈ các tin đã được kiểm chứng; mỗi nhận định phải dẫn [số] nguồn. ${TRUTH_RULES}
CHỈ xuất JSON: {"title":"Thế Giới Trong Tay ${day}: <tiêu đề>","content_md":"bài báo markdown 700-1200 từ: Toàn cảnh kinh tế-chính trị → Chứng khoán → Vàng → USD → Crypto → Rủi ro & lịch sự kiện ngày mai","market_view":{"stocks":{"bias":"tang|giam|di_ngang","reason":"..."},"gold":{...},"usd":{...},"crypto":{...}}}`,
      json: true,
      maxTokens: 5000,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `NGÀY: ${day}\nTIN ĐÃ KIỂM CHỨNG (${ver.verified.length}/${uniq.length}):\n${src || "(không tin nào vượt kiểm chứng — hãy nói rõ)"}`,
        },
      ],
    },
    pool,
  );
  const j = parseJson<{ title: string; content_md: string; market_view: Record<string, unknown> }>(
    synth.text,
  );
  const sb = await admin();
  const row = {
    company_code: company,
    title: j?.title ?? `Thế Giới Trong Tay ${day}`,
    content_md: j?.content_md ?? synth.text,
    market_view: j?.market_view ?? {},
    sources: ver.verified.map((h) => ({ title: h.title, url: h.url, source: h.citation })),
    verified_by: ver.verified_by,
  };
  const { data, error } = await sb
    .from("daily_world_news")
    .insert(row)
    .select("id,news_date")
    .single();
  if (error) throw new Error(`Lưu bản tin lỗi: ${error.message}`);
  return {
    ...row,
    id: (data as { id: string }).id,
    ai_name: synth.gateway.name,
    rejected: ver.rejected.length,
  };
}

export async function legalResearch(o: {
  question: string;
  company?: string | undefined;
  jurisdiction?: "VN" | "INTL" | "BOTH" | undefined;
}) {
  const company = o.company ?? COMPANY_DEFAULT;
  const ans = await truthAnswer({
    question: o.question,
    company,
    category: "phap_luat",
    sources: ["openalex", "wikidata", "gdelt"],
    persona: `Bạn là Hội đồng Pháp lý JETBU AI (Luật Doanh nghiệp VN, Đất đai, Thuế, Nghị định 30/2020, Luật Quốc tế: Common Law, VIAC/SIAC). Phạm vi: ${o.jurisdiction ?? "BOTH"}. Luôn ghi rõ số hiệu văn bản, điều/khoản khi trích dẫn; nếu không chắc văn bản còn hiệu lực thì ghi "cần đối chiếu bản gốc trên vbpl.vn". Phân loại rủi ro ĐỎ/VÀNG/XANH.`,
  });
  const pool = await loadGateways();
  const meta = await askFirst(
    {
      system: 'CHỈ xuất JSON: {"title":"tiêu đề ngắn tiếng Việt","risk_level":"do|vang|xanh"}',
      json: true,
      maxTokens: 200,
      messages: [{ role: "user", content: clip(ans.answer_md, 3000) }],
    },
    pool,
  )
    .then((r) => parseJson<{ title: string; risk_level: "do" | "vang" | "xanh" }>(r.text))
    .catch(() => null);
  const sb = await admin();
  const row = {
    company_code: company,
    jurisdiction: o.jurisdiction ?? "BOTH",
    question: o.question,
    title: meta?.title ?? clip(o.question, 120),
    content_md: ans.answer_md,
    risk_level: meta?.risk_level ?? null,
    citations: ans.citations,
    verified_by: ans.verified_by,
  };
  const { data, error } = await sb.from("legal_knowledge").insert(row).select("id").single();
  if (error) throw new Error(`Lưu tri thức pháp luật lỗi: ${error.message}`);
  return { ...ans, id: (data as { id: string }).id, title: row.title, risk_level: row.risk_level };
}

/* ============================================================================================
 * 8. GHI ÂM → VĂN BẢN (Groq Whisper) + NHẬN DIỆN NGƯỜI NÓI (AI suy luận ngữ cảnh)
 * ========================================================================================== */
export type Segment = { t0: number; t1: number; speaker: string; text: string };
export async function transcribe(
  file: Blob,
  fileName = "audio.webm",
  language = "vi",
): Promise<{ text: string; segments: { start: number; end: number; text: string }[] }> {
  const key = await keyFor("GROQ_API_KEY", /api\.groq\.com/);
  if (!key) throw new Error("Cần khóa GROQ_API_KEY để chuyển giọng nói thành văn bản (Whisper).");
  const fd = new FormData();
  fd.append("file", file, fileName);
  fd.append("model", "whisper-large-v3-turbo");
  fd.append("response_format", "verbose_json");
  fd.append("language", language);
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok)
    throw new Error(`Whisper HTTP ${r.status}: ${clip(await r.text().catch(() => ""), 200)}`);
  const j = (await r.json()) as {
    text?: string;
    segments?: { start: number; end: number; text: string }[];
  };
  return {
    text: j.text ?? "",
    segments: (j.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() })),
  };
}

/** Diarization: Whisper không nhận giọng; AI gán "Người nói N" theo ngữ cảnh lượt lời (ghi rõ là suy luận). */
export async function diarize(
  segments: { start: number; end: number; text: string }[],
  knownSpeakers: string[] = [],
): Promise<Segment[]> {
  if (!segments.length) return [];
  const pool = await loadGateways();
  const lines = segments
    .map((s, i) => `${i}|${s.start.toFixed(1)}-${s.end.toFixed(1)}|${s.text}`)
    .join("\n");
  try {
    const r = await askFirst(
      {
        system: `Bạn gán người nói cho từng dòng hội thoại cuộc họp tiếng Việt dựa trên ngữ cảnh (xưng hô, chủ đề, lượt lời). Tên có sẵn: ${knownSpeakers.join(", ") || "chưa có → dùng 'Người nói 1', 'Người nói 2'..."}. CHỈ xuất JSON: {"map":[{"i":0,"speaker":"Người nói 1"}...]}`,
        json: true,
        maxTokens: 4000,
        temperature: 0.1,
        messages: [{ role: "user", content: lines }],
      },
      pool,
    );
    const m = new Map(
      (parseJson<{ map: { i: number; speaker: string }[] }>(r.text)?.map ?? []).map((x) => [
        x.i,
        x.speaker,
      ]),
    );
    return segments.map((s, i) => ({
      t0: s.start,
      t1: s.end,
      speaker: m.get(i) ?? "Người nói 1",
      text: s.text,
    }));
  } catch {
    return segments.map((s) => ({ t0: s.start, t1: s.end, speaker: "Người nói 1", text: s.text }));
  }
}

export const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const segmentsToMd = (segs: Segment[]) =>
  segs.map((s) => `[${fmtTime(s.t0)}] **${s.speaker}:** ${s.text}`).join("\n");

export async function saveMeeting(o: {
  title: string;
  company?: string;
  segments: Segment[];
  mode: "full" | "summary";
  duration_sec: number;
}) {
  const transcript_md = segmentsToMd(o.segments);
  let summary_md: string | null = null;
  if (o.mode === "summary") {
    const r = await askFirst({
      system: `Thư ký cuộc họp JETBU AI. Tóm tắt tiếng Việt: Mục đích · Quyết định · Việc cần làm (ai/khi nào) · Rủi ro · Câu hỏi mở. Chỉ dựa trên biên bản, không thêm. Markdown.`,
      maxTokens: 2500,
      messages: [{ role: "user", content: clip(transcript_md, 40_000) }],
    });
    summary_md = r.text;
  }
  const speakers = [...new Set(o.segments.map((s) => s.speaker))].map((label) => ({ label }));
  const sb = await admin();
  const { data, error } = await sb
    .from("meeting_transcripts")
    .insert({
      company_code: o.company ?? COMPANY_DEFAULT,
      title: o.title,
      duration_sec: o.duration_sec,
      speakers,
      segments: o.segments,
      transcript_md,
      summary_md,
      mode: o.mode,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Lưu biên bản lỗi: ${error.message}`);
  return { id: (data as { id: string }).id, transcript_md, summary_md };
}

/* ============================================================================================
 * 9. CỐ VẤN & TRỢ LÝ ADMIN (nhắc việc, lịch, tài chính, thực thi mệnh lệnh)
 * ========================================================================================== */
export type AdvisorAction = {
  type: "reminder" | "schedule" | "finance" | "command";
  title: string;
  due_at?: string | null;
  detail?: string;
};
export async function advisorChat(o: {
  message: string;
  company?: string | undefined;
  history?: Msg[] | undefined;
  kind?: "chat" | "voice" | undefined;
}) {
  const company = o.company ?? COMPANY_DEFAULT;
  const sb = await admin();
  const nowVN = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const { data: pending } = await sb
    .from("admin_advisor_logs")
    .select("id,kind,content,due_at")
    .eq("company_code", company)
    .eq("done", false)
    .in("kind", ["reminder", "schedule", "finance"])
    .order("due_at", { ascending: true })
    .limit(15);
  const agenda = ((pending ?? []) as { kind: string; content: string; due_at: string | null }[])
    .map(
      (p) =>
        `- (${p.kind}) ${p.content}${p.due_at ? ` — hạn ${new Date(p.due_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}`,
    )
    .join("\n");
  const ans = await truthAnswer({
    question: `${o.message}\n\n[Ngữ cảnh trợ lý] Bây giờ là ${nowVN}. Việc đang chờ của Admin:\n${agenda || "(trống)"}`,
    company,
    history: o.history,
    persona: `Bạn là Cố vấn & Trợ lý riêng của Admin JETBU AI: nhắc việc, quản lý lịch, tài chính cá nhân/công ty, thực thi mệnh lệnh. Khi Admin yêu cầu nhắc/lên lịch/ghi chi tiêu, hãy ghi vào "actions". Trong answer_md luôn thêm cuối cùng một khối JSON trong thẻ <actions>[...]</actions> với các mục {"type":"reminder|schedule|finance|command","title":"...","due_at":"ISO 8601 hoặc null","detail":"..."} (rỗng [] nếu không có).`,
  });
  const m = ans.answer_md.match(/<actions>([\s\S]*?)<\/actions>/);
  let actions: AdvisorAction[] = [];
  if (m?.[1]) {
    try {
      actions = (JSON.parse(m[1]) as AdvisorAction[]).filter((a) => a?.title);
    } catch {
      actions = [];
    }
  }
  const reply = ans.answer_md.replace(/<actions>[\s\S]*?<\/actions>/, "").trim();
  const rows = [
    { company_code: company, kind: o.kind ?? "chat", role: "user", content: o.message },
    {
      company_code: company,
      kind: o.kind ?? "chat",
      role: "assistant",
      content: reply,
      tier_used: ans.tier_used,
      citations: ans.citations,
      ai_name: ans.ai_name,
    },
    ...actions.map((a) => ({
      company_code: company,
      kind: a.type === "command" ? "command" : a.type,
      role: "system",
      content: `${a.title}${a.detail ? ` — ${a.detail}` : ""}`,
      due_at: a.due_at ?? null,
    })),
  ];
  await sb.from("admin_advisor_logs").insert(rows);
  return { ...ans, answer_md: reply, actions };
}

/* ============================================================================================
 * 10. BỘ NÃO 3D: đề xuất tác phẩm mới từ liên kết tri thức
 * ========================================================================================== */
export async function proposeWorks(company = COMPANY_DEFAULT) {
  const sb = await admin();
  const { data } = await sb
    .from("knowledge_md_store")
    .select("title,category,tags,file_name,content_md")
    .eq("company_code", company)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);
  const docs = (data ?? []) as {
    title: string;
    category: string;
    tags: string[];
    file_name: string;
    content_md: string;
  }[];
  if (!docs.length)
    return {
      proposals: [] as {
        title: string;
        topic: string;
        rationale: string;
        linked_files: string[];
      }[],
      ai_name: "—",
    };
  const r = await askFirst({
    system: `Bạn là Bộ Não Thứ 2 của JETBU AI. Từ danh sách tri thức đã học, phát hiện liên kết nhân quả giữa các tài liệu và khoảng trống tri thức, rồi đề xuất 3-5 TÁC PHẨM MỚI nên viết theo chu trình Lục Đạo (${LUC_DAO.join(" → ")}) có ứng dụng cho: ${ENTERPRISES.join(", ")}. Chỉ đề xuất dựa trên tài liệu thật bên dưới (ghi tên file liên quan). CHỈ xuất JSON: {"proposals":[{"title":"tên tác phẩm tiếng Việt","topic":"đề tài 1-2 câu để Hội đồng nghiên cứu","rationale":"vì sao (liên kết nhân quả)","linked_files":["file.md"]}]}`,
    json: true,
    maxTokens: 2500,
    temperature: 0.5,
    messages: [
      {
        role: "user",
        content: docs
          .map(
            (d) =>
              `- [${d.category}] ${d.file_name}: ${d.title} — ${clip(d.content_md.replace(/\s+/g, " "), 240)}`,
          )
          .join("\n"),
      },
    ],
  });
  return {
    proposals:
      parseJson<{
        proposals: { title: string; topic: string; rationale: string; linked_files: string[] }[];
      }>(r.text)?.proposals ?? [],
    ai_name: r.gateway.name,
  };
}
