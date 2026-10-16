import { createFileRoute } from "@tanstack/react-router";
import { findModel } from "@/lib/ai-models";
import { brainStream } from "@/lib/brain.server";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages: Msg[]; modelKey: string; companyName?: string; canvas?: boolean };
        const model = findModel(body.modelKey);
        const system = `${model.persona} Bạn là JETBU AI – Siêu trí tuệ quản trị & cố vấn chiến lược. Luôn trả lời bằng tiếng Việt chuyên nghiệp. Pháp nhân đang làm việc: ${body.companyName ?? "chưa chọn"}.${body.canvas ? " Người dùng đang soạn thảo song song: khi được yêu cầu soạn văn bản, hãy viết văn bản hoàn chỉnh dạng markdown." : ""}`;
        return brainStream({ system, messages: (body.messages ?? []).slice(-30), signal: request.signal, preferredModelKey: model.key });
      },
    },
  },
});
