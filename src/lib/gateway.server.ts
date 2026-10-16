/** Streams plain text from Lovable AI (chat completions) for a JSON-producing prompt. */
export async function streamGatewayText(opts: { system: string; user: string | unknown[]; signal: AbortSignal; json?: boolean; model?: string }): Promise<Response> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return Response.json({ error: "Chưa cấu hình khóa AI." }, { status: 500 });
  const up = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal: opts.signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      stream: true,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.user }],
    }),
  });
  if (!up.ok || !up.body) {
    const s = up.status;
    const msg = s === 429 ? "Hệ thống AI đang quá tải, thử lại sau ít phút." : s === 402 ? "Đã hết tín dụng AI. Nạp thêm trong Cài đặt → Gói & tín dụng." : "Không thể kết nối AI lúc này.";
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
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}
