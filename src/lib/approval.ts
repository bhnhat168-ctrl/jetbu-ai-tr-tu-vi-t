/** Standard approved file name: [Ngày]_[PhòngBan]_Approved.pdf */
export function approvedFileName(date: Date, department: string): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date); // Vietnam calendar day
  const dept = department
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "") || "PhongBan";
  return `${d}_${dept}_Approved.pdf`;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const AI_KEYS = [
  { env: "GEMINI_PRO_API_KEY", label: "Google Gemini Pro" },
  { env: "GEMINI_API_KEY", label: "Google Gemini Flash Free" },
  { env: "GROQ_API_KEY", label: "Groq Siêu tốc — Llama 3.3 70B" },
  { env: "OPENROUTER_API_KEY", label: "OpenRouter — DeepSeek V3 / R1 Free" },
  { env: "ANTHROPIC_API_KEY", label: "Claude / Anthropic" },
] as const;

/** Strips DeepSeek <think> blocks and ```json fences, returning the outermost {...}. */
export function cleanJson(raw: string): string {
  const s = raw.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<think>[\s\S]*$/g, "").replace(/```(?:json)?/gi, "");
  return s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1);
}
