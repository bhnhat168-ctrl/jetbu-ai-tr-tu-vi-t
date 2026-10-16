import { createFileRoute } from "@tanstack/react-router";
import { streamGatewayText } from "@/lib/gateway.server";

const KIND: Record<string, string> = {
  invoice: "Hóa đơn (số hóa đơn, ký hiệu, ngày, bên bán, MST bên bán, bên mua, MST bên mua, từng dòng hàng, tiền trước thuế, thuế GTGT, tổng tiền)",
  contract: "Hợp đồng (số hợp đồng, ngày ký, bên A, bên B, đại diện, đối tượng, giá trị, thời hạn, phương thức thanh toán, điều khoản phạt)",
  cccd: "Căn cước công dân (số CCCD, họ tên, ngày sinh, giới tính, quốc tịch, quê quán, nơi thường trú, ngày hết hạn)",
};

export const Route = createFileRoute("/api/ocr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { image, kind } = (await request.json()) as { image?: string; kind?: string };
        if (!image?.startsWith("data:image/") || image.length > 8_000_000) return Response.json({ error: "Ảnh không hợp lệ hoặc quá lớn." }, { status: 400 });
        const desc = KIND[kind ?? ""] ?? KIND.invoice;
        return streamGatewayText({
          json: true,
          signal: request.signal,
          system: `Bạn là hệ thống OCR giấy tờ Việt Nam. Đọc chính xác chữ trong ảnh, KHÔNG bịa. Trường không đọc được để chuỗi rỗng. Chỉ xuất json: {"doc_type":"...","fields":[{"label":"tên trường tiếng Việt","value":"giá trị"}],"raw_text":"toàn bộ chữ đọc được"}`,
          user: [
            { type: "text", text: `Loại giấy tờ: ${desc}. Trích xuất các trường và trả về json.` },
            { type: "image_url", image_url: { url: image } },
          ],
        });
      },
    },
  },
});
