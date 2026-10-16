/**
 * JETBU AI Brain — one server-side entry for every AI feature (chat, arena, legal, knowledge).
 * Provider order: own GEMINI_API_KEY → own GROQ_API_KEY → built-in Lovable AI.
 * Keys are read only on the server; they never reach the browser.
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

function pickProvider(needsVision: boolean) {
  const gemini = process.env["GEMINI_API_KEY"];
  const groq = process.env["GROQ_API_KEY"];
  if (gemini) return { name: "Gemini (khóa riêng)", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: gemini, model: "gemini-2.5-flash", headers: {} as Record<string, string> };
  if (groq && !needsVision) return { name: "Groq (khóa riêng)", url: "https://api.groq.com/openai/v1/chat/completions", key: groq, model: "llama-3.3-70b-versatile", headers: {} };
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!lovable) return null;
  return { name: "Lovable AI", url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: lovable, model: "google/gemini-3-flash-preview", headers: { "X-Lovable-AIG-SDK": "fetch" } };
}

export function brainProviderName(): string {
  return pickProvider(false)?.name ?? "Chưa có";
}

export async function brainStream(opts: { system: string; messages: Msg[]; signal: AbortSignal; json?: boolean | undefined; rules?: boolean | undefined }): Promise<Response> {
  const needsVision = opts.messages.some((m) => Array.isArray(m.content));
  const p = pickProvider(needsVision);
  if (!p) return Response.json({ error: "Chưa cấu hình khóa AI." }, { status: 500 });
  const system = opts.rules === false ? opts.system : `${opts.system}\n${BRAIN_RULES}`;
  const up = await fetch(p.url, {
    method: "POST",
    signal: opts.signal,
    headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json", ...p.headers },
    body: JSON.stringify({
      model: p.model,
      stream: true,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: system }, ...opts.messages],
    }),
  });
  if (!up.ok || !up.body) {
    const s = up.status;
    const msg =
      s === 429 ? `${p.name} đang quá tải, thử lại sau ít phút.` :
      s === 402 ? "Đã hết tín dụng AI. Nạp thêm trong Cài đặt → Gói & tín dụng." :
      s === 401 || s === 403 ? `${p.name} từ chối khóa API — hãy kiểm tra lại khóa.` :
      `Không thể kết nối ${p.name} lúc này.`;
    return Response.json({ error: msg }, { status: s });
  }
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  const stream = up.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        buf += dec.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          const t = l.trim();
          if (!t.startsWith("data:")) continue;
          const d = t.slice(5).trim();
          if (!d || d === "[DONE]") continue;
          try {
            const c = JSON.parse(d).choices?.[0]?.delta?.content;
            if (c) ctrl.enqueue(enc.encode(c));
          } catch { /* partial frame */ }
        }
      },
    }),
  );
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-JETBU-Provider": encodeURIComponent(p.name) } });
}
