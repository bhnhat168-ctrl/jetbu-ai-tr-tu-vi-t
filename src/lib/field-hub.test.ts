import { describe, it, expect } from "vitest";
import { sha256Hex, stampLines, signaturePayload } from "./field-hub";

describe("field hub", () => {
  it("stamp includes GPS, Vietnam time and company", () => {
    const l = stampLines({ lat: 21.0285, lng: 105.8542, at: new Date("2026-10-16T18:00:00Z"), companyName: "JETBU", staff: "An" });
    expect(l[0]).toContain("JETBU");
    expect(l[1]).toContain("21.028500, 105.854200");
    expect(l[2]).toContain("01:00:00");
  });
  it("signature code changes when signer changes", async () => {
    const a = await sha256Hex(signaturePayload({ png: "x", signer: "A", at: "t", companyCode: "C" }));
    const b = await sha256Hex(signaturePayload({ png: "x", signer: "B", at: "t", companyCode: "C" }));
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });
});
