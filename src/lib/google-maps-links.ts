export type MapViewpoint = { longitude: number; latitude: number; zoom: number };

function coordinates(view: MapViewpoint) {
  return `${view.latitude.toFixed(7)},${view.longitude.toFixed(7)}`;
}

// MapLibre's world is 512 px at zoom 0; Google Maps uses 256 px.
// Maps URLs accept only integer zooms up to 21, so the scale is approximate.
export function googleSatelliteUrl(view: MapViewpoint) {
  const params = new URLSearchParams({ api: "1", map_action: "map", center: coordinates(view),
    zoom: String(Math.max(0, Math.min(21, Math.round(view.zoom + 1)))), basemap: "satellite" });
  return `https://www.google.com/maps/@?${params}`;
}

export function googleStreetViewUrl(view: MapViewpoint) {
  const params = new URLSearchParams({ api: "1", map_action: "pano", viewpoint: coordinates(view) });
  return `https://www.google.com/maps/@?${params}`;
}
