import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CatalogDataset, CatalogStats } from "@/types/phase3";

const CATALOG_PATH = path.join(
  process.cwd(),
  "data",
  "catalog",
  "meriti",
  "dataset-inventory.csv"
);

const CATALOG_FIELDS: Array<keyof CatalogDataset> = [
  "id",
  "source_name",
  "source_institution",
  "source_url",
  "acquisition_route",
  "access_status",
  "license",
  "spatial_coverage",
  "spatial_resolution",
  "temporal_coverage",
  "format",
  "crs",
  "evidence_family",
  "potential_use",
  "known_limitations",
  "raw_storage_path",
  "collection_status",
  "promotion_status",
  "collected_at",
  "notes"
];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(field);
      field = "";

      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);

  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

export function parseCatalogCsv(text: string): CatalogDataset[] {
  const [headerRow, ...dataRows] = parseCsv(text.trim());

  if (!headerRow) {
    return [];
  }

  const headerIndex = new Map<string, number>();
  headerRow.forEach((name, index) => {
    headerIndex.set(name.trim(), index);
  });

  return dataRows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => normalizeCatalogDataset(row, headerIndex));
}

export function normalizeCatalogDataset(
  row: string[],
  headerIndex: Map<string, number>
): CatalogDataset {
  const record = {} as Record<keyof CatalogDataset, string>;

  for (const field of CATALOG_FIELDS) {
    const index = headerIndex.get(field);
    record[field] = index === undefined ? "" : (row[index] ?? "").trim();
  }

  return record as CatalogDataset;
}

export async function readCatalogDatasets(): Promise<CatalogDataset[]> {
  const csv = await readFile(CATALOG_PATH, "utf8");
  return parseCatalogCsv(csv);
}

export function canUseDatasetAsPrimaryOverlay(dataset: CatalogDataset): boolean {
  return dataset.promotion_status === "promoted";
}

export function hasComparableTemporalEvidence(dataset: CatalogDataset): boolean {
  return (
    dataset.promotion_status === "promoted" &&
    dataset.evidence_family.toLowerCase().includes("temporal")
  );
}

export function getCatalogStats(datasets: CatalogDataset[]): CatalogStats {
  return {
    total: datasets.length,
    downloaded: datasets.filter(
      (dataset) => dataset.collection_status === "downloaded"
    ).length,
    candidates: datasets.filter(
      (dataset) => dataset.promotion_status === "candidate"
    ).length,
    deferred: datasets.filter(
      (dataset) => dataset.promotion_status === "deferred"
    ).length,
    promoted: datasets.filter(canUseDatasetAsPrimaryOverlay).length,
    temporalPromoted: datasets.filter(hasComparableTemporalEvidence).length
  };
}
