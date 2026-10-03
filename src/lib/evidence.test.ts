import { describe, expect, it } from "vitest";

import type { EvidenceLayer } from "@/types/phase3";

import {
  getAvailablePrimaryEvidenceLayers,
  getToggleableMapOverlayLayers
} from "./evidence";

const layers: EvidenceLayer[] = [
  {
    id: "score",
    family: "Flooding",
    label: "Score",
    status: "available",
    resolution: "Bairro",
    temporalCoverage: "Atual",
    sourceDatasetIds: [],
    layerFile: "data/processed/layers/neighborhood-scores.geojson",
    legend: []
  },
  {
    id: "temporal-context",
    family: "Temporal evidence",
    label: "SNIS",
    status: "available",
    resolution: "Município",
    temporalCoverage: "1995-2022",
    sourceDatasetIds: [],
    layerFile: "data/processed/evidence/snis.json",
    legend: []
  },
  {
    id: "pending",
    family: "Pending",
    label: "Pending",
    status: "pending",
    resolution: "n/a",
    temporalCoverage: "n/a",
    sourceDatasetIds: [],
    legend: []
  }
];

describe("evidence layer guards", () => {
  it("recognizes available promoted evidence", () => {
    expect(getAvailablePrimaryEvidenceLayers(layers).map((layer) => layer.id)).toEqual([
      "score",
      "temporal-context"
    ]);
  });

  it("allows only available GeoJSON layers to be toggled on the map", () => {
    const toggleable = getToggleableMapOverlayLayers(layers);

    expect(toggleable.map((layer) => layer.id)).toEqual(["score"]);
  });
});
