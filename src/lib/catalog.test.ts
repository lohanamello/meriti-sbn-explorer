import { describe, expect, it } from "vitest";

import {
  canUseDatasetAsPrimaryOverlay,
  getCatalogStats,
  parseCatalogCsv
} from "./catalog";

const CSV_HEADER =
  "id,source_name,source_institution,source_url,acquisition_route,access_status,license,spatial_coverage,spatial_resolution,temporal_coverage,format,crs,evidence_family,potential_use,known_limitations,raw_storage_path,collection_status,promotion_status,collected_at,notes";

describe("catalog parsing", () => {
  it("parses quoted catalog fields without splitting embedded commas", () => {
    const csv = `${CSV_HEADER}
dataset_a,"Fonte, com virgula",IPP,https://example.com,direct,open,open,Rio,AP,Atual,GeoJSON,EPSG:4326,Temporal evidence,Teste,"Limite, anotado",data/raw/a,downloaded,candidate,2026-05-17,"nota, com virgula"`;

    const [dataset] = parseCatalogCsv(csv);

    expect(dataset.source_name).toBe("Fonte, com virgula");
    expect(dataset.known_limitations).toBe("Limite, anotado");
    expect(dataset.notes).toBe("nota, com virgula");
  });

  it("keeps primary map overlays blocked until promotion", () => {
    const csv = `${CSV_HEADER}
candidate_layer,Fonte A,IPP,https://example.com,direct,open,open,Rio,AP,Atual,GeoJSON,EPSG:4326,Administrative boundaries,Base,,data/raw/a,downloaded,candidate,2026-05-17,
promoted_layer,Fonte B,IPP,https://example.com,direct,open,open,Rio,AP,Atual,GeoJSON,EPSG:4326,Temporal evidence,Temporal,,data/raw/b,downloaded,promoted,2026-05-17,`;

    const datasets = parseCatalogCsv(csv);

    expect(canUseDatasetAsPrimaryOverlay(datasets[0])).toBe(false);
    expect(canUseDatasetAsPrimaryOverlay(datasets[1])).toBe(true);
    expect(getCatalogStats(datasets)).toMatchObject({
      total: 2,
      downloaded: 2,
      candidates: 1,
      promoted: 1,
      temporalPromoted: 1
    });
  });
});
