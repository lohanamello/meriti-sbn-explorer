import type { Feature, MultiPolygon, Polygon } from "geojson";

export type ValidationCell = Feature<Polygon | MultiPolygon, { sample_id: string; clipped_cell_area_m2: number }>;
export type ReferenceMetadata = { dates: number[]; resolutions: number[] };

export function cellBounds(cell: ValidationCell): [[number, number], [number, number]] {
  const polygons = cell.geometry.type === "Polygon" ? [cell.geometry.coordinates] : cell.geometry.coordinates;
  const points = polygons.flat(2);
  return [[Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))],
    [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))]];
}
