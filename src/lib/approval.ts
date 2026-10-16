/** Standard approved file name: [Ngày]_[PhòngBan]_Approved.pdf */
export function approvedFileName(date: Date, department: string): string {
  const d = date.toISOString().slice(0, 10);
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
  { env: "GEMINI_API_KEY", label: "Google Gemini" },
  { env: "GROQ_API_KEY", label: "Groq" },
  { env: "DEEPSEEK_API_KEY", label: "DeepSeek" },
  { env: "ANTHROPIC_API_KEY", label: "Claude (Anthropic)" },
  { env: "XAI_API_KEY", label: "Grok (xAI)" },
] as const;
