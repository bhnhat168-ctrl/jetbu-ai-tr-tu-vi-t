import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AI_KEYS, approvedFileName, sha256Hex } from "./approval";

const idInput = (d: unknown) => z.object({ id: z.string().uuid() }).parse(d);

export const summarizeReport = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { brainComplete } = await import("./brain.server");
    const { data: r, error } = await supabaseAdmin.from("approval_reports").select("*").eq("id", data.id).single();
    if (error || !r) throw new Error("Không tìm thấy báo cáo");
    const summary = await brainComplete({
      rules: false,
      system: "Bạn là thư ký điều hành. Tóm tắt báo cáo bằng tiếng Việt: 3-5 gạch đầu dòng ý chính, 1 dòng rủi ro, 1 dòng đề xuất.",
      user: `Tiêu đề: ${r.title}\nPhòng ban: ${r.department}\n\n${(r.draft_content ?? "").slice(0, 30000)}`,
    });
    if (!summary) throw new Error("Không tạo được tóm tắt.");
    const { error: upErr } = await supabaseAdmin.from("approval_reports").update({ ai_summary: summary }).eq("id", data.id).eq("status", "pending");
    if (upErr) throw new Error(upErr.message);
    return { summary };
  });

export const approveReport = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin.from("approval_reports").select("*").eq("id", data.id).single();
    if (error || !r) throw new Error("Không tìm thấy báo cáo");
    if (r.status === "approved") throw new Error("Báo cáo đã được duyệt trước đó (không thể duyệt lại).");
    if (!r.ai_summary) throw new Error("Cần có tóm tắt AI ở Trạm 2 trước khi duyệt.");
    const now = new Date();
    const approvedPath = approvedFileName(now, r.department);
    const content = r.draft_content ?? "";
    const signature = await sha256Hex(`${approvedPath}\n${r.company_code}\n${r.author_name}\n${now.toISOString()}\n${content}`);
    const { error: upErr } = await supabaseAdmin.from("approval_reports")
      .update({ status: "approved", approved_path: approvedPath, signature_hash: signature }).eq("id", r.id).eq("status", "pending");
    if (upErr) throw new Error(upErr.message);
    const { error: kvErr } = await supabaseAdmin.from("knowledge_vectors").insert({
      company_code: r.company_code,
      domain: `Báo cáo nội bộ — ${r.department}`,
      title: r.title,
      content: `${r.ai_summary}\n\n---\n${content}`.slice(0, 20000),
      source_citation: `${approvedPath} · SHA-256 ${signature}`,
    });
    if (kvErr) throw new Error(`Đã duyệt nhưng chưa nạp được vào kho tri thức: ${kvErr.message}`);
    return { approvedPath, signature };
  });

const envNames = AI_KEYS.map((k) => k.env) as [string, ...string[]];

/** Write-only: overrides keys in server memory. Values are never sent back to the browser. */
export const saveApiKeys = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.record(z.enum(envNames), z.string().max(500)).parse(d))
  .handler(async ({ data }) => {
    const { setRuntimeKeys } = await import("./brain.server");
    setRuntimeKeys(data as Record<string, string>);
    return { saved: Object.values(data).filter((v) => v.trim()).length };
  });

async function probe(env: string, key: string): Promise<boolean> {
  const H = { Authorization: `Bearer ${key}` };
  const url =
    env === "GROQ_API_KEY" ? "https://api.groq.com/openai/v1/models" :
    env === "OPENROUTER_API_KEY" ? "https://openrouter.ai/api/v1/key" :
    env.startsWith("GEMINI") ? "https://generativelanguage.googleapis.com/v1beta/openai/models" :
    "https://api.anthropic.com/v1/models";
  const headers = env === "ANTHROPIC_API_KEY" ? { "x-api-key": key, "anthropic-version": "2023-06-01" } : H;
  const r = await fetch(url, { headers }).catch(() => null);
  return Boolean(r?.ok);
}

export const checkConnections = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ only: z.string().optional() }).optional().parse(d))
  .handler(async ({ data }) => {
    const { getKey, brainProviderName } = await import("./brain.server");
    const keys = await Promise.all(AI_KEYS.filter((k) => !data?.only || k.env === data.only).map(async (k) => {
      const v = getKey(k.env);
      return { env: k.env, configured: Boolean(v), active: v ? await probe(k.env, v) : false };
    }));
    let lovableAi = false;
    const lk = process.env["LOVABLE_API_KEY"];
    if (lk && !data?.only) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/models", { headers: { Authorization: `Bearer ${lk}` } }).catch(() => null);
      lovableAi = Boolean(r?.ok);
    }
    return { keys, lovableAi, primary: brainProviderName(), checkedAt: new Date().toISOString() };
  });
