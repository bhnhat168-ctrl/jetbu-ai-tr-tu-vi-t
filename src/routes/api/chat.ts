import { createFileRoute } from "@tanstack/react-router";
import { findModel } from "@/lib/ai-models";

type Msg = { role: "user" | "assistant"; content: string };
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "Chưa cấu hình khóa AI." }, { status: 500 });
        const body = (await request.json()) as { messages: Msg[]; modelKey: string; companyName?: string; canvas?: boolean };
        const model = findModel(body.modelKey);
        const system = `${model.persona} Bạn là JETBU AI – Siêu trí tuệ quản trị & cố vấn chiến lược. Luôn trả lời bằng tiếng Việt chuyên nghiệp. Pháp nhân đang làm việc: ${body.companyName ?? "chưa chọn"}.${body.canvas ? " Người dùng đang soạn thảo song song: khi được yêu cầu soạn văn bản, hãy viết văn bản hoàn chỉnh dạng markdown." : ""}`;
        const messages = (body.messages ?? []).slice(-30);

        const upstream =
          model.api === "messages"
            ? await fetch(`${GATEWAY}/messages`, {
                method: "POST",
                signal: request.signal,
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
                body: JSON.stringify({ model: model.gatewayModel, max_tokens: 8000, system, messages, stream: true }),
              })
            : await fetch(`${GATEWAY}/chat/completions`, {
                method: "POST",
                signal: request.signal,
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
                body: JSON.stringify({ model: model.gatewayModel, stream: true, messages: [{ role: "system", content: system }, ...messages] }),
              });

        if (!upstream.ok || !upstream.body) {
          const s = upstream.status;
          const msg =
            s === 429 ? "Hệ thống AI đang quá tải, vui lòng thử lại sau ít phút." :
            s === 402 ? "Đã hết tín dụng AI. Vui lòng nạp thêm trong Cài đặt → Gói & tín dụng." :
            s === 403 ? "Mô hình này chưa được cấp quyền cho workspace." :
            "Không thể kết nối AI lúc này.";
          return Response.json({ error: msg }, { status: s });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buf = "";
        const stream = upstream.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, ctrl) {
              buf += decoder.decode(chunk, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() ?? "";
              for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith("data:")) continue;
                const data = t.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const j = JSON.parse(data);
                  const text =
                    model.api === "messages"
                      ? j.type === "content_block_delta" && j.delta?.type === "text_delta" ? j.delta.text : ""
                      : j.choices?.[0]?.delta?.content ?? "";
                  if (j.type === "message_delta" && j.delta?.stop_reason === "refusal") ctrl.enqueue(encoder.encode("\n\n_(Mô hình từ chối trả lời yêu cầu này.)_"));
                  if (text) ctrl.enqueue(encoder.encode(text));
                } catch {
                  /* partial frame ignored */
                }
              }
            },
          }),
        );
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
