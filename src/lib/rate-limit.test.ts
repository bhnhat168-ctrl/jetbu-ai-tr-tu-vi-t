import { describe, expect, it } from "vitest";
import { checkRateLimit, SEARCH_LIMIT } from "./rate-limit";

describe("search rate limit", () => {
  it("allows 10 searches per minute and blocks the 11th", () => {
    let ts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = checkRateLimit(ts, 1000 + i, SEARCH_LIMIT.max, SEARCH_LIMIT.windowMs);
      expect(r.allowed).toBe(true);
      ts = r.recent;
    }
    expect(checkRateLimit(ts, 2000, SEARCH_LIMIT.max, SEARCH_LIMIT.windowMs).allowed).toBe(false);
  });
  it("frees up once the minute has passed", () => {
    const ts = Array.from({ length: 10 }, () => 0);
    expect(checkRateLimit(ts, 60_001, 10, 60_000).allowed).toBe(true);
  });
});
