import { describe, expect, it } from "vitest";
import { mergeReviews, parseReviewFile, REVIEW_SOURCE, serializeReviews, type CellReview } from "./cell-reviews";
const row: CellReview = { sampleId: "MERITI-V1-0001", vegetation: "unsure", source: REVIEW_SOURCE, imageDate: "2026-07-02", status: "draft", updatedAt: "2026-10-04T19:00:00Z" };
const ids = new Set([row.sampleId]);
describe("review backups", () => {
  it("round-trips uncertainty without turning it into absence or a validated label", () => {
    const restored = parseReviewFile(serializeReviews({ [row.sampleId]: row }), ids);
    expect(restored[row.sampleId]).toEqual(row);
    expect(restored[row.sampleId].vegetation).toBe("unsure");
  });
  it.each([{ status: "adjudicated" }, { vegetation: "invalid" }, { source: "Esri" }, { sampleId: "other" }])("rejects incompatible or contradictory annotations: %j", (change) => {
    expect(() => parseReviewFile(JSON.stringify({ schema: "meriti.cell-reviews.v1", records: [{ ...row, ...change }] }), ids)).toThrow();
  });
  it("does not overwrite newer local work with an older backup", () => {
    const newer = { ...row, vegetation: "present" as const, updatedAt: "2026-10-04T20:00:00Z" };
    expect(mergeReviews({ [row.sampleId]: newer }, { [row.sampleId]: row })[row.sampleId]).toEqual(newer);
  });
});
