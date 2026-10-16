export type ModelChoice = {
  key: string;
  label: string;
  note: string;
  model: string;
  persona: string;
};

export const MODEL_CHOICES: ModelChoice[] = [
  { key: "auto", label: "Tự động định tuyến thông minh (Smart Routing)", note: "Tự chọn nhà cung cấp còn hoạt động", model: "auto", persona: "Bạn là trợ lý quản trị đa năng." },
  { key: "deepseek-v3", label: "DeepSeek V3 (OpenRouter Free)", note: "deepseek/deepseek-chat:free", model: "deepseek/deepseek-chat:free", persona: "Bạn là trợ lý quản trị đa năng." },
  { key: "deepseek-r1", label: "Toán định lượng & Suy luận sâu (DeepSeek R1 Free)", note: "deepseek/deepseek-r1:free", model: "deepseek/deepseek-r1:free", persona: "Bạn là chuyên gia toán định lượng, tài chính. Trình bày từng bước tính toán rõ ràng." },
  { key: "groq", label: "Groq Llama 3.3 70B (Siêu tốc < 1s)", note: "llama-3.3-70b-versatile", model: "llama-3.3-70b-versatile", persona: "Bạn là trợ lý nhanh, súc tích." },
  { key: "gemini-pro", label: "Google Gemini 2.5 Pro", note: "gemini-2.5-pro", model: "gemini-2.5-pro", persona: "Bạn là chuyên gia phân tích chiến lược sâu sắc." },
  { key: "gemini-flash", label: "Google Gemini 2.5 Flash", note: "gemini-2.5-flash", model: "gemini-2.5-flash", persona: "Bạn là trợ lý nhanh, súc tích." },
];

export const findModel = (key: string): ModelChoice => MODEL_CHOICES.find((m) => m.key === key) ?? MODEL_CHOICES[0]!;
