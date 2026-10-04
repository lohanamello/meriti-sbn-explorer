"use client";

import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { cellBounds, type ValidationCell } from "@/lib/validation-cells";
import { GoogleMapComparison } from "./google-map-comparison";
import type { MapViewpoint } from "@/lib/google-maps-links";

export function ValidationCellMap({ cell }: { cell: ValidationCell }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outlineVisible, setOutlineVisible] = useState(true);
  const [comparisonView, setComparisonView] = useState<MapViewpoint | null>(null);
  const [comparisonMarker, setComparisonMarker] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !panelRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [-43.37, -22.785], zoom: 14, maxZoom: 22,
      style: { version: 8, sources: { imagery: {
        type: "raster", tileSize: 256, maxzoom: 19,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      } }, layers: [{ id: "photo", type: "raster", source: "imagery" }] }
    });
    mapRef.current = map;
    const updateComparisonView = () => {
      const center = map.getCenter();
      setComparisonView({ longitude: center.lng, latitude: center.lat, zoom: map.getZoom() });
    };
    map.on("moveend", updateComparisonView);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.FullscreenControl({ container: panelRef.current }), "top-right");
    map.on("load", () => {
      updateComparisonView();
      map.addSource("cell", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "cell-outline", type: "line", source: "cell", paint: { "line-color": "#ff37dc", "line-width": 3 } });
      setLoaded(true);
    });
    map.on("error", () => setError("Parte da imagem não carregou. Use o painel CBERS acima ou tente novamente mais tarde."));
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;
    (map.getSource("cell") as GeoJSONSource).setData(cell);
    map.fitBounds(cellBounds(cell), { padding: 100, maxZoom: 20, duration: 0 });
  }, [cell, loaded]);

  useEffect(() => {
    if (loaded) mapRef.current?.setPaintProperty("cell-outline", "line-opacity", outlineVisible ? 1 : 0);
  }, [loaded, outlineVisible]);

  return <>
    <div className="validation-gallery-controls">
      <button type="button" onClick={() => mapRef.current?.fitBounds(cellBounds(cell), { padding: 100, maxZoom: 20 })}>Centralizar célula</button>
      <button type="button" aria-pressed={outlineVisible} onClick={() => setOutlineVisible(!outlineVisible)}>{outlineVisible ? "Ocultar contorno" : "Mostrar contorno"}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="validation-map-panel" ref={panelRef} aria-label={`Foto detalhada da célula ${cell.properties.sample_id}`}>
      <div className="validation-map-canvas" ref={containerRef} />
      <div className="validation-map-comparison"><GoogleMapComparison view={comparisonView} onToggle={(open) => { if (open) setComparisonMarker(true); }} /></div>
      {comparisonMarker && <div className="map-comparison-crosshair" aria-hidden="true" />}
      <div className="validation-map-label">{cell.properties.sample_id} · {cell.properties.clipped_cell_area_m2.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m² · {outlineVisible ? "contorno magenta" : "contorno oculto"}</div>
    </div>
  </>;
}
