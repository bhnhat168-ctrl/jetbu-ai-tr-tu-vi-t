export type ModelChoice = {
  key: string;
  label: string;
  note: string;
  gatewayModel: string;
  api: "chat" | "messages";
  persona: string;
};

// Labels are what the user picks; gatewayModel is what actually runs on Lovable AI.
export const MODEL_CHOICES: ModelChoice[] = [
  { key: "auto", label: "Tự động định tuyến thông minh", note: "Gemini 3 Flash", gatewayModel: "google/gemini-3-flash-preview", api: "chat", persona: "Bạn là trợ lý quản trị đa năng." },
  { key: "gemini", label: "Gemini 2.5 Flash", note: "Gemini 2.5 Flash", gatewayModel: "google/gemini-2.5-flash", api: "chat", persona: "Bạn là trợ lý nhanh, súc tích." },
  { key: "claude", label: "Claude Sonnet", note: "Claude Sonnet 5", gatewayModel: "anthropic/claude-sonnet-5", api: "messages", persona: "Bạn là chuyên gia soạn thảo văn bản, hợp đồng và báo cáo chặt chẽ." },
  { key: "quant", label: "Toán định lượng (kiểu DeepSeek-R1)", note: "chạy trên Gemini 2.5 Pro", gatewayModel: "google/gemini-2.5-pro", api: "chat", persona: "Bạn là chuyên gia toán định lượng, tài chính. Trình bày từng bước tính toán rõ ràng." },
  { key: "macro", label: "Tin vĩ mô (kiểu Grok-3)", note: "chạy trên Gemini 3 Flash", gatewayModel: "google/gemini-3-flash-preview", api: "chat", persona: "Bạn là chuyên gia phân tích kinh tế vĩ mô, thị trường và chính sách." },
];

export const findModel = (key: string) => MODEL_CHOICES.find((m) => m.key === key) ?? MODEL_CHOICES[0];
