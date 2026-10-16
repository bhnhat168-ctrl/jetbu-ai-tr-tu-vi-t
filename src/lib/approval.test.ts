import { describe, expect, it } from "vitest";
import { approvedFileName, sha256Hex } from "./approval";

describe("approval station 3", () => {
  it("names the file [Ngày]_[PhòngBan]_Approved.pdf", () => {
    expect(approvedFileName(new Date("2026-10-17T03:00:00Z"), "Tài chính - Kế toán")).toBe("2026-10-17_TaichinhKetoan_Approved.pdf");
  });
  it("produces a SHA-256 signature", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
