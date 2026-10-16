import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AI_KEYS, approvedFileName, sha256Hex } from "./approval";

const idInput = (d: unknown) => z.object({ id: z.string().uuid() }).parse(d);

export const summarizeReport = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin.from("approval_reports").select("*").eq("id", data.id).single();
    if (error || !r) throw new Error("Không tìm thấy báo cáo");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Chưa cấu hình khóa AI");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là thư ký điều hành. Tóm tắt báo cáo bằng tiếng Việt: 3-5 gạch đầu dòng ý chính, 1 dòng rủi ro, 1 dòng đề xuất." },
          { role: "user", content: `Tiêu đề: ${r.title}\nPhòng ban: ${r.department}\n\n${(r.draft_content ?? "").slice(0, 30000)}` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI đang quá tải, thử lại sau.");
    if (res.status === 402) throw new Error("Đã hết tín dụng AI.");
    if (!res.ok) throw new Error("Không tạo được tóm tắt.");
    const j = await res.json();
    const summary: string = j.choices?.[0]?.message?.content ?? "";
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

export const checkConnections = createServerFn({ method: "POST" }).handler(async () => {
  const keys = AI_KEYS.map((k) => ({ env: k.env, configured: Boolean(process.env[k.env]) }));
  let lovableAi = false;
  const key = process.env["LOVABLE_API_KEY"];
  if (key) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/models", { headers: { Authorization: `Bearer ${key}` } }).catch(() => null);
    lovableAi = Boolean(r?.ok);
  }
  return { keys, lovableAi, checkedAt: new Date().toISOString() };
});
