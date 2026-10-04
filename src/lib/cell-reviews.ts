export const REVIEW_STORAGE_KEY = "meriti-cell-reviews-v1";
export const REVIEW_SOURCE = "INPE/CBERS-4A WPM L4 2026-07-02 PAN2m RGB-NIR8m";
export const COMPARISON_REVIEW_SOURCE = "Esri World Imagery online + INPE/CBERS-4A WPM L4 2026-07-02";
export type CellReview = {
  sampleId: string;
  vegetation: "present" | "absent" | "unsure";
  source: typeof REVIEW_SOURCE | typeof COMPARISON_REVIEW_SOURCE;
  imageDate: "2026-07-02" | null;
  status: "draft";
  updatedAt: string;
};
export type ReviewFile = { schema: "meriti.cell-reviews.v1"; records: CellReview[] };

export function parseReviewFile(text: string, allowedIds: Set<string>): Record<string, CellReview> {
  const file = JSON.parse(text) as ReviewFile;
  if (file?.schema !== "meriti.cell-reviews.v1" || !Array.isArray(file.records) || file.records.length > allowedIds.size) throw new Error("Formato de arquivo incompatível.");
  const records: Record<string, CellReview> = {};
  for (const row of file.records) {
    if (!row || !allowedIds.has(row.sampleId) || Object.hasOwn(records, row.sampleId)
      || !["present", "absent", "unsure"].includes(row.vegetation)
      || !((row.source === REVIEW_SOURCE && row.imageDate === "2026-07-02") || (row.source === COMPARISON_REVIEW_SOURCE && row.imageDate === null)) || row.status !== "draft"
      || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt))) throw new Error("O arquivo contém uma avaliação inválida ou de outra amostra.");
    records[row.sampleId] = { sampleId: row.sampleId, vegetation: row.vegetation, source: row.source, imageDate: row.imageDate, status: "draft", updatedAt: row.updatedAt };
  }
  return records;
}

export function serializeReviews(records: Record<string, CellReview>) {
  return JSON.stringify({ schema: "meriti.cell-reviews.v1", records: Object.values(records).sort((a, b) => a.sampleId.localeCompare(b.sampleId)) } satisfies ReviewFile, null, 2);
}

// Preserve the most recent local assessment when a backup contains older work.
export function mergeReviews(local: Record<string, CellReview>, incoming: Record<string, CellReview>) {
  const merged = { ...local };
  for (const [id, row] of Object.entries(incoming)) {
    if (!merged[id] || Date.parse(row.updatedAt) > Date.parse(merged[id].updatedAt)) merged[id] = row;
  }
  return merged;
}
