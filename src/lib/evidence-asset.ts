import type { EvidenceLayer } from "@/types/phase3";

export function evidenceAssetUrl(layer: EvidenceLayer, year?: number) {
  const file = layer.yearFiles && year !== undefined ? layer.yearFiles[String(year)] : layer.layerFile;
  if (!file || !/^(layers|rasters)\/[a-zA-Z0-9._-]+\.(png|geojson)$/.test(file)) {
    throw new Error(`Arquivo indisponível para ${layer.label}.`);
  }
  return `/meriti/evidence/${file}`;
}
