/**
 * Lớp gọi API + đọc bảng Rebirth từ trình duyệt (bảng mới chưa có trong types.ts sinh tự động).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const jdb = supabase as unknown as SupabaseClient;

export const CATEGORIES = [
  {
    id: "so_ghi_chu",
    folder: "00_So_Ghi_Chu_NotebookLM_Claude",
    label: "Sổ ghi chú NotebookLM & Claude",
  },
  { id: "nao_bo_2", folder: "01_Kho_Tri_Thuc_Nao_Bo_2", label: "Kho Tri Thức Não Bộ 2" },
  {
    id: "sach_luc_dao",
    folder: "02_Sach_Va_Cong_Trinh_Luc_Dao",
    label: "Sách & Công trình Lục Đạo",
  },
  {
    id: "the_gioi",
    folder: "03_The_Gioi_Trong_Tay_Moi_Ngay",
    label: "Thế Giới Trong Tay Mỗi Ngày",
  },
  { id: "phap_luat", folder: "04_Tri_Thuc_Phap_Luat", label: "Tri Thức Pháp Luật" },
  { id: "bien_ban", folder: "05_Bien_Ban_Cuoc_Hop_Va_Co_Van", label: "Biên bản Cuộc họp & Cố vấn" },
  {
    id: "van_ban",
    folder: "06_Tai_Lieu_Chinh_Sua_Word_Excel_PDF",
    label: "Tài liệu Word / Excel / PDF",
  },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const categoryFolder = (id: string) => CATEGORIES.find((c) => c.id === id)?.folder ?? id;

export type MdDoc = {
  id: string;
  category: string;
  title: string;
  file_name: string;
  content_md: string;
  source_type: string;
  source_url: string | null;
  source_name: string | null;
  tags: string[];
  word_count: number;
  verified_by: string[];
  created_at: string;
  chunks?: number | undefined;
};

/** Gọi JETBU Core Engine. Trả JSON; ném Error với thông điệp tiếng Việt. */
export async function core<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch("/api/jetbu-core-engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
    ...(signal ? { signal } : {}),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(j.error ?? `Lỗi máy chủ (${res.status})`);
  return j as T;
}

/** Stream NDJSON (Hội đồng Lục Đạo): gọi onLine cho mỗi dòng JSON. */
export async function coreStream(
  payload: Record<string, unknown>,
  onLine: (o: Record<string, unknown>) => void,
  signal?: AbortSignal,
) {
  const res = await fetch("/api/jetbu-core-engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `Lỗi máy chủ (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines)
      if (l.trim()) {
        try {
          onLine(JSON.parse(l));
        } catch {
          /* bỏ dòng hỏng */
        }
      }
  }
  if (buf.trim()) {
    try {
      onLine(JSON.parse(buf));
    } catch {
      /* */
    }
  }
}

export async function uploadAudio(
  blob: Blob,
  opts: { diarize?: boolean; speakers?: string[]; language?: string } = {},
) {
  const fd = new FormData();
  fd.append("file", blob, `ghi_am_${Date.now()}.webm`);
  fd.append("diarize", opts.diarize ? "1" : "0");
  fd.append("speakers", (opts.speakers ?? []).join(","));
  fd.append("language", opts.language ?? "vi");
  const res = await fetch("/api/jetbu-core-engine", { method: "POST", body: fd });
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    text?: string;
    segments?: { t0: number; t1: number; speaker: string; text: string }[];
    transcript_md?: string;
  };
  if (!res.ok) throw new Error(j.error ?? "Không chuyển được giọng nói.");
  return j as {
    text: string;
    segments: { t0: number; t1: number; speaker: string; text: string }[];
    transcript_md: string;
  };
}

export async function listMd(
  opts: { company?: string; category?: string; limit?: number; q?: string } = {},
): Promise<MdDoc[]> {
  let q = jdb
    .from("knowledge_md_store")
    .select(
      "id,category,title,file_name,content_md,source_type,source_url,source_name,tags,word_count,verified_by,created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 60);
  if (opts.company) q = q.eq("company_code", opts.company);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.q?.trim()) q = q.ilike("title", `%${opts.q.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as MdDoc[];
}

export type KhoTitle = {
  id: string;
  title: string;
  file_name: string;
  category: string;
  word_count: number | null;
  tags: string[];
};
/** Danh mục tài liệu Kho (tối đa 300, mới nhất trước). */
export async function khoTitles(company?: string): Promise<KhoTitle[]> {
  const r = await core<{ titles: KhoTitle[] }>("kho_titles", company ? { company } : {});
  return r.titles ?? [];
}

export async function mdStats(
  company?: string,
): Promise<{ category: string; docs: number; words: number; last_at: string | null }[]> {
  const { data, error } = await jdb.rpc("knowledge_md_stats", { p_company: company ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    category: string;
    docs: number;
    words: number;
    last_at: string | null;
  }[];
}

/** Tải file xuống máy (Mobile & Desktop). */
export function downloadText(name: string, text: string, type = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function downloadBlob(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const viSlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "tai_lieu";
export const todayVN = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
export const mdFileName = (title: string) => `${todayVN()}_${viSlug(title)}.md`;

/** Nén văn bản thô thành .md siêu nhẹ (bỏ khoảng trắng thừa, chuẩn hóa tiêu đề). */
export function compressToMd(
  title: string,
  raw: string,
  meta: Record<string, string> = {},
): string {
  const body = raw
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const head = Object.entries(meta)
    .map(([k, v]) => `- **${k}:** ${v}`)
    .join("\n");
  return `# ${title}\n\n${head ? `${head}\n\n---\n\n` : ""}${body}\n`;
}

/** Kiểu lỏng cho thư viện nạp động từ esm.sh (không có khai báo kiểu). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;

/** Nạp thư viện trình duyệt theo nhu cầu (không thêm dependency vào bundle). */
export async function esm<T = unknown>(url: string): Promise<T> {
  return (await import(/* @vite-ignore */ url)) as T;
}
