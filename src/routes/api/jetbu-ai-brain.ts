import { createFileRoute } from "@tanstack/react-router";
import { brainStream } from "@/lib/brain.server";

/** General entry to the JETBU AI Brain: { question, companyName?, history? } → streamed Vietnamese 5-step analysis. */
export const Route = createFileRoute("/api/jetbu-ai-brain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const b = (await request.json()) as { question?: string; companyName?: string; history?: { role: "user" | "assistant"; content: string }[] };
        if (!b.question?.trim()) return Response.json({ error: "Vui lòng nhập câu hỏi." }, { status: 400 });
        return brainStream({
          system: `Bạn là JETBU AI – Siêu trí tuệ quản trị & cố vấn chiến lược. Pháp nhân: ${b.companyName ?? "chưa chọn"}. Trình bày rõ 5 bước có tiêu đề.`,
          messages: [...(b.history ?? []).slice(-20), { role: "user", content: b.question.slice(0, 20000) }],
          signal: request.signal,
        });
      },
    },
  },
});
