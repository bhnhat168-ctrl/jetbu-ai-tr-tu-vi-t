import { createFileRoute } from "@tanstack/react-router";
import { streamGatewayText } from "@/lib/gateway.server";

const SYSTEM = `Bạn là Hội Đồng Cố Vấn Pháp Lý Đa Tầng của JETBU AI gồm 3 chuyên gia:
(law) Luật Doanh nghiệp & M&A (Term Sheet, SHA); (finance) Luật Tài chính & Ngân hàng Quốc tế; (arbitration) Trọng tài Thương mại (VIAC/SIAC).
Rà soát văn bản hợp đồng, tìm bẫy pháp lý theo pháp luật Việt Nam và chuẩn quốc tế. Trả lời HOÀN TOÀN bằng tiếng Việt, chỉ xuất một đối tượng json:
{"summary":"tóm tắt 2-3 câu","experts":[{"id":"law|finance|arbitration","opinion":"nhận định 2-3 câu"}],
 "risks":[{"level":"red|yellow|green","clause":"trích nguyên văn điều khoản (ngắn)","issue":"vấn đề/bẫy","legal_basis":"căn cứ pháp lý","expert":"law|finance|arbitration","redraft":"câu chữ soạn lại bảo vệ quyền lợi bên mình"}]}
red = rủi ro chí mạng cần bác bỏ ngay (phạt vô hạn, mất quyền kiểm soát, bồi thường không giới hạn...); yellow = cần đàm phán lại thương mại; green = an toàn theo chuẩn quốc tế (redraft có thể giữ nguyên). Liệt kê đủ cả 3 mức nếu có. Sắp xếp red trước.`;

export const Route = createFileRoute("/api/legal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { text, side, companyName } = (await request.json()) as { text: string; side?: string; companyName?: string };
        if (!text?.trim()) return Response.json({ error: "Vui lòng dán điều khoản hợp đồng." }, { status: 400 });
        return streamGatewayText({
          system: SYSTEM,
          json: true,
          signal: request.signal,
          user: `Pháp nhân: ${companyName ?? "chưa chọn"}. Bên cần bảo vệ: ${side || "bên mình"}.\nVăn bản hợp đồng (trả về json):\n${String(text).slice(0, 40000)}`,
        });
      },
    },
  },
});
