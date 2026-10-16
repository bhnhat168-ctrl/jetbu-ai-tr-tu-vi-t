/**
 * JETBU AI Brain — one server-side entry for every AI feature (chat, arena, legal, knowledge, reports).
 * Tries providers in order with automatic fallback: user's pick → OpenRouter DeepSeek → Groq → Gemini Pro/Flash → Lovable AI.
 * Keys come from server secrets, optionally overridden at runtime from Admin Tab 5. They never reach the browser.
 */
export const BRAIN_RULES = `
[QUY TẮC JETBU AI BRAIN]
Luôn trả lời bằng tiếng Việt chuyên nghiệp. Với mọi câu hỏi chiến lược/kinh doanh, suy luận theo CHUỖI 5 BƯỚC:
(Bước 1) Bối cảnh Thế giới & Chu kỳ Hạ Nguyên Vận 9 (Hành Hỏa 2024-2043).
(Bước 2) Dòng tiền thực OCF, so sánh WACC với ROIC & định lượng (nêu rõ số nào là giả định).
(Bước 3) Cấu trúc Vốn & Pháp lý.
(Bước 4) Ba kịch bản Tích cực / Cơ sở / Tiêu cực kèm xác suất % (tổng = 100%).
(Bước 5) Khuyến nghị hành động & Mức cắt lỗ bảo vệ.
HỘI ĐỒNG 6 TÁC TỬ: (1) Tài chính Định lượng & Dòng vốn 25% – Veto; (2) Khoa học Cứng & Vật lý 15% – Veto; (3) Vận 9 & Kinh Dịch 10% – chỉ chọn thời điểm, không veto; (4) Lịch sử Định lượng & Địa chính trị 20% – Veto; (5) Lý thuyết Trò chơi & Tâm lý Thần kinh 15% – BATNA/Nash; (6) Văn hóa, Tôn giáo, Sharia & Nhân khẩu học 15%. Confluence Score = Σ(trọng số × điểm).
HỘI ĐỒNG PHÁP LÝ QUỐC TẾ: Luật Doanh nghiệp & M&A (Term Sheet, SHA); Luật Tài chính & Ngân hàng Quốc tế; Trọng tài Thương mại VIAC/SIAC. Phân loại rủi ro ĐỎ/VÀNG/XANH.
Nếu đầu ra được yêu cầu là json thì vẫn tuân theo đúng cấu trúc json được yêu cầu, áp dụng 5 bước bên trong nội dung.`;

type Msg = { role: "system" | "user" | "assistant"; content: unknown };

/** Runtime overrides set from Admin Tab 5 (lives while the server instance is warm). */
const runtimeKeys: Record<string, string> = {};
export function setRuntimeKeys(keys: Record<string, string>) {
  for (const [k, v] of Object.entries(keys)) if (v.trim()) runtimeKeys[k] = v.trim();
}
export function getKey(env: string): string | undefined {
  return runtimeKeys[env] || process.env[env] || undefined;
}

type Provider = { name: string; url: string; key: string; model: string; headers: Record<string, string>; vision: boolean; jsonMode: boolean };

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEM_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

function buildChain(preferred: string | undefined, needsVision: boolean): Provider[] {
  const or = getKey("OPENROUTER_API_KEY"), groq = getKey("GROQ_API_KEY");
  const gemPro = getKey("GEMINI_PRO_API_KEY"), gem = getKey("GEMINI_API_KEY"), lov = process.env["LOVABLE_API_KEY"];
  const orH = { "HTTP-Referer": "https://jetbu.ai", "X-Title": "JETBU AI" };
  const all: Record<string, Provider | null> = {
    "deepseek-v3": or ? { name: "OpenRouter DeepSeek V3", url: OR_URL, key: or, model: "deepseek/deepseek-chat:free", headers: orH, vision: false, jsonMode: true } : null,
    "deepseek-r1": or ? { name: "OpenRouter DeepSeek R1", url: OR_URL, key: or, model: "deepseek/deepseek-r1:free", headers: orH, vision: false, jsonMode: false } : null,
    groq: groq ? { name: "Groq Llama 3.3 70B", url: GROQ_URL, key: groq, model: "llama-3.3-70b-versatile", headers: {}, vision: false, jsonMode: true } : null,
    "gemini-pro": gemPro || gem ? { name: "Gemini 2.5 Pro", url: GEM_URL, key: (gemPro || gem)!, model: "gemini-2.5-pro", headers: {}, vision: true, jsonMode: true } : null,
    "gemini-flash": gem || gemPro ? { name: "Gemini 2.5 Flash", url: GEM_URL, key: (gem || gemPro)!, model: "gemini-2.5-flash", headers: {}, vision: true, jsonMode: true } : null,
    lovable: lov ? { name: "Lovable AI", url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: lov, model: "google/gemini-3-flash-preview", headers: { "X-Lovable-AIG-SDK": "fetch" }, vision: true, jsonMode: true } : null,
  };
  const order = [preferred && preferred !== "auto" ? preferred : "", preferred === "deepseek-r1" ? "deepseek-r1" : "deepseek-v3", "groq", "gemini-pro", "gemini-flash", "lovable"];
  const seen = new Set<string>();
  const chain: Provider[] = [];
  for (const k of order) {
    const p = k ? all[k] : null;
    if (!p || seen.has(k) || (needsVision && !p.vision)) continue;
    seen.add(k); chain.push(p);
  }
  return chain;
}

export function brainProviderName(preferred?: string): string {
  return buildChain(preferred, false)[0]?.name ?? "Chưa có";
}

async function openUpstream(opts: { system: string; messages: Msg[]; signal: AbortSignal; json?: boolean | undefined; rules?: boolean | undefined; preferredModelKey?: string | undefined }) {
  const needsVision = opts.messages.some((m) => Array.isArray(m.content));
  const chain = buildChain(opts.preferredModelKey, needsVision);
  if (!chain.length) return { error: Response.json({ error: "Chưa cấu hình khóa AI nào." }, { status: 500 }) };
  let system = opts.rules === false ? opts.system : `${opts.system}\n${BRAIN_RULES}`;
  let last = 0;
  for (const p of chain) {
    const sys = opts.json && !p.jsonMode ? `${system}\nCHỈ xuất một đối tượng JSON hợp lệ, không thêm chữ nào khác.` : system;
    try {
      const up = await fetch(p.url, {
        method: "POST",
        signal: opts.signal,
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json", ...p.headers },
        body: JSON.stringify({
          model: p.model,
          stream: true,
          ...(opts.json && p.jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages: [{ role: "system", content: sys }, ...opts.messages],
        }),
      });
      if (up.ok && up.body) return { up, p };
      last = up.status;
      console.warn(`[brain] ${p.name} failed ${up.status}, trying next`);
      await up.body?.cancel();
    } catch (e) {
      if (opts.signal.aborted) return { error: new Response(null, { status: 499 }) };
      console.warn(`[brain] ${p.name} error`, e);
    }
  }
  system = "";
  const msg = last === 429 ? "Tất cả nhà cung cấp AI đang quá tải, thử lại sau ít phút." : last === 402 ? "Đã hết tín dụng AI." : "Không nhà cung cấp AI nào phản hồi — hãy kiểm tra khóa ở Tab 5.";
  return { error: Response.json({ error: msg }, { status: last || 502 }) };
}

function textStream(body: ReadableStream<Uint8Array>) {
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "";
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        const t = l.trim();
        if (!t.startsWith("data:")) continue;
        const d = t.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try { const c = JSON.parse(d).choices?.[0]?.delta?.content; if (c) ctrl.enqueue(enc.encode(c)); } catch { /* partial */ }
      }
    },
  }));
}

export async function brainStream(opts: { system: string; messages: Msg[]; signal: AbortSignal; json?: boolean | undefined; rules?: boolean | undefined; preferredModelKey?: string | undefined }): Promise<Response> {
  const r = await openUpstream(opts);
  if ("error" in r) return r.error!;
  return new Response(textStream(r.up.body!), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-JETBU-Provider": encodeURIComponent(r.p.name) } });
}

/** Full text answer (still streamed upstream), used by server functions such as report summaries. */
export async function brainComplete(opts: { system: string; user: string; rules?: boolean; preferredModelKey?: string }): Promise<string> {
  const res = await brainStream({ system: opts.system, messages: [{ role: "user", content: opts.user }], signal: new AbortController().signal, rules: opts.rules, preferredModelKey: opts.preferredModelKey });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "AI lỗi");
  return (await res.text()).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
