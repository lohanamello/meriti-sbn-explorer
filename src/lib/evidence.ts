import type { EvidenceLayer } from "@/types/phase3";

export function isPrimaryEvidenceAvailable(layer: EvidenceLayer): boolean {
  return layer.status === "available";
}

export function isMockEvidence(layer: EvidenceLayer): boolean {
  return layer.status === "mock";
}

export function getAvailablePrimaryEvidenceLayers(
  layers: EvidenceLayer[]
): EvidenceLayer[] {
  return layers.filter(isPrimaryEvidenceAvailable);
}

export function isMapOverlayLayer(layer: EvidenceLayer): boolean {
  return (
    isPrimaryEvidenceAvailable(layer) && (layer.layerFile?.endsWith(".geojson") === true || Boolean(layer.image && layer.layerFile?.endsWith(".png")))
  );
}

export function getToggleableMapOverlayLayers(
  layers: EvidenceLayer[]
): EvidenceLayer[] {
  return layers.filter(isMapOverlayLayer);
}
