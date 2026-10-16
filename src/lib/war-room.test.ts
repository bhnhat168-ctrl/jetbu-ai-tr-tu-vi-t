import { describe, expect, it } from "vitest";
import { EXPERTS, activeVetoes, confluenceScore } from "./war-room";

describe("war room rules", () => {
  it("weights are 25/15/10/20/15/15 and sum to 100%", () => {
    expect(EXPERTS.map((e) => e.weight)).toEqual([0.25, 0.15, 0.1, 0.2, 0.15, 0.15]);
    expect(EXPERTS.reduce((s, e) => s + e.weight, 0)).toBeCloseTo(1);
  });
  it("score = sum of weight * expert score", () => {
    expect(confluenceScore({ 1: 80, 2: 60, 3: 100, 4: 50, 5: 70, 6: 40 })).toBe(65.5);
  });
  it("expert 3 cannot veto; 1, 2, 4 can", () => {
    expect(activeVetoes([1, 2, 3, 4, 5, 6].map((id) => ({ id, veto: true })))).toEqual([1, 2, 4]);
  });
});
