export type ModelChoice = {
  key: string;
  label: string;
  note: string;
  model: string;
  persona: string;
};

export const MODEL_CHOICES: ModelChoice[] = [
  { key: "auto", label: "Tự động định tuyến thông minh (Smart Routing)", note: "Tự chọn nhà cung cấp còn hoạt động", model: "auto", persona: "Bạn là trợ lý quản trị đa năng." },
  { key: "deepseek-v3", label: "DeepSeek V4 Flash (OpenRouter)", note: "deepseek/deepseek-v4-flash", model: "deepseek/deepseek-v4-flash", persona: "Bạn là trợ lý quản trị đa năng." },
  { key: "deepseek-r1", label: "Toán định lượng & Suy luận sâu (DeepSeek V4 Pro)", note: "deepseek/deepseek-v4-pro", model: "deepseek/deepseek-v4-pro", persona: "Bạn là chuyên gia toán định lượng, tài chính. Trình bày từng bước tính toán rõ ràng." },
  { key: "groq", label: "Groq GPT-OSS 120B (Siêu tốc < 1s)", note: "openai/gpt-oss-120b", model: "openai/gpt-oss-120b", persona: "Bạn là trợ lý nhanh, súc tích." },
  { key: "gemini-pro", label: "Google Gemini Pro (mới nhất)", note: "gemini-pro-latest", model: "gemini-pro-latest", persona: "Bạn là chuyên gia phân tích chiến lược sâu sắc." },
  { key: "gemini-flash", label: "Google Gemini Flash (mới nhất)", note: "gemini-flash-latest", model: "gemini-flash-latest", persona: "Bạn là trợ lý nhanh, súc tích." },
];

export const findModel = (key: string): ModelChoice => MODEL_CHOICES.find((m) => m.key === key) ?? MODEL_CHOICES[0]!;
