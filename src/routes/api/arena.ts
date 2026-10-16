import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `Bạn là Hội đồng Tranh biện 6 Tác tử của JETBU AI. Trả lời HOÀN TOÀN bằng tiếng Việt, chỉ xuất một đối tượng JSON hợp lệ (json), không kèm chữ nào khác.
6 chuyên gia (id 1-6):
1 Tài chính Định lượng & Dòng vốn (25%, Veto)
2 Khoa học Cứng & Vật lý Vũ trụ (15%, Veto)
3 Chu kỳ Vận 9 & Kinh Dịch (10%, KHÔNG veto, chỉ chọn thời điểm)
4 Lịch sử Định lượng & Địa chính trị (20%, Veto)
5 Lý thuyết Trò chơi & Tâm lý Thần kinh (15%, lập ma trận BATNA/Cân bằng Nash)
6 Văn hóa, Tôn giáo, Sharia & Nhân khẩu học (15%)
Cấu trúc JSON:
{
 "round1": [{"id":1,"score":0-100,"stance":"ủng hộ|trung lập|phản đối","veto":true|false,"reasoning":"2-3 câu"}...6 mục],
 "round2": [{"from":1,"target":4,"critique":"phản biện kiểu Ác (devil's advocate) 1-2 câu"}...6 mục],
 "round3": {"verdict":"kết luận tổng trọng tài 2-3 câu","timing":"thời điểm hành động do chuyên gia 3 đề xuất","scenarios":[{"name":"Tích cực","probability":0-100,"outcome":"...","stop_loss":"mức cắt lỗ cụ thể"},{"name":"Cơ sở",...},{"name":"Tiêu cực",...}]},
 "hexagram": "tên quẻ Kinh Dịch hiện tại phù hợp bài toán + 1 câu ý nghĩa",
 "alerts": {"ocf":{"status":"an toàn|cảnh báo|nguy hiểm","note":"..."},"wacc_roic":{"wacc":số %,"roic":số %,"note":"..."},"m_score":{"value":số (Beneish),"note":"..."}}
}
Chỉ chuyên gia 1,2,4 được veto=true. Xác suất 3 kịch bản cộng lại = 100. Các chỉ số trong alerts là ước tính dựa trên dữ kiện đề bài; nếu thiếu số liệu hãy nói rõ là giả định.`;

export const Route = createFileRoute("/api/arena")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "Chưa cấu hình khóa AI." }, { status: 500 });
        const { problem, companyName } = (await request.json()) as { problem: string; companyName?: string };
        const up = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: request.signal,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            stream: true,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: `Pháp nhân: ${companyName ?? "chưa chọn"}.\nBài toán chiến lược (trả về json):\n${String(problem).slice(0, 6000)}` },
            ],
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
                } catch { /* partial */ }
              }
            },
          }),
        );
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
