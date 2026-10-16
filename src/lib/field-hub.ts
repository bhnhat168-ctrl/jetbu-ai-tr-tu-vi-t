export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Text stamped on every check-in photo. */
export function stampLines(o: { lat: number; lng: number; accuracy?: number; at: Date; companyName: string; staff: string }): string[] {
  const t = o.at.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
  return [
    `${o.companyName} — ${o.staff}`,
    `GPS: ${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}${o.accuracy ? ` (±${Math.round(o.accuracy)}m)` : ""}`,
    `Thời gian: ${t} (GMT+7)`,
  ];
}

/** Anti-forgery code: hash of signature image + signer + timestamp + company. */
export function signaturePayload(o: { png: string; signer: string; at: string; companyCode: string }): string {
  return `${o.companyCode}|${o.signer}|${o.at}|${o.png}`;
}
