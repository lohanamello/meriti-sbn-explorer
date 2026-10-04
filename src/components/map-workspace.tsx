"use client";

import type { FeatureCollection, Geometry } from "geojson";
import maplibregl, {
  type GeoJSONSource,
  type StyleSpecification
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import { useOverlayData } from "@/lib/use-overlay-data";
import { evidenceAssetUrl } from "@/lib/evidence-asset";
import { featurePopup, showFeaturePopup } from "@/lib/map-feature-popup";
import { GoogleMapComparison } from "./google-map-comparison";
import type { MapViewpoint } from "@/lib/google-maps-links";
import type {
  EvidenceLayer,
  Locality,
  Phase3ExplorerData,
  TerritorialUnit
} from "@/types/phase3";

const EMPTY_COLLECTION: FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: []
};
const OVERLAY_PREFIX = "phase3-overlay";
type BoundsTuple = [[number, number], [number, number]];

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      tileSize: 256,
      // Beyond this level, enlarge existing imagery rather than request finer tiles.
      maxzoom: 19,
      attribution:
        "Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    }
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#17211f"
      }
    },
    {
      id: "reference-imagery",
      type: "raster",
      source: "esri-world-imagery",
      paint: {
        "raster-brightness-max": 0.72,
        "raster-brightness-min": 0.08,
        "raster-opacity": 0.88,
        "raster-saturation": -0.45
      }
    }
  ]
};

export function MapWorkspace({
  units,
  studyArea,
  year,
  selectionRevision,
  selectedUnitId,
  activeLayers,
  viewportUnit,
  focusedLocality,
  onSelectLocality,
  onSelectUnit
}: {
  units: TerritorialUnit[];
  studyArea: Phase3ExplorerData["studyArea"];
  year: number;
  selectionRevision: number;
  selectedUnitId: string;
  activeLayers: EvidenceLayer[];
  viewportUnit?: TerritorialUnit;
  focusedLocality?: Locality;
  onSelectLocality?: (id: string) => void;
  onSelectUnit: (unitId: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectUnitRef = useRef(onSelectUnit);
  const onSelectLocalityRef = useRef(onSelectLocality);
  const hasFitInitialViewportRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [comparisonView, setComparisonView] = useState<MapViewpoint | null>(null);
  const [comparisonMarker, setComparisonMarker] = useState(false);
  const { collections: overlayCollections, errors: overlayErrors, loading: loadingOverlays } = useOverlayData(activeLayers, year);

  useEffect(() => {
    onSelectUnitRef.current = onSelectUnit;
    onSelectLocalityRef.current = onSelectLocality;
  }, [onSelectUnit, onSelectLocality]);

  const unitCollection = useMemo<FeatureCollection<Geometry>>(
    () => ({
      type: "FeatureCollection",
      features: units.map((unit) => ({
        ...unit.geometry,
        properties: {
          ...(unit.geometry.properties ?? {}),
          id: unit.id,
          name: unit.name,
          selected: unit.id === selectedUnitId
        }
      }))
    }),
    [selectedUnitId, units]
  );
  const inspectionMode = activeLayers.length === 0;
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId),
    [selectedUnitId, units]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const mapContainer = mapContainerRef.current;
    const map = new maplibregl.Map({
      attributionControl: false,
      center: getBoundsCenter(studyArea.bounds),
      container: mapContainer,
      maxZoom: 22,
      minZoom: 10,
      style: BASE_STYLE,
      zoom: 12
    });
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            map.resize();
          });

    mapRef.current = map;
    const updateComparisonView = () => {
      const center = map.getCenter();
      setComparisonView({ longitude: center.lng, latitude: center.lat, zoom: map.getZoom() });
    };
    map.on("moveend", updateComparisonView);
    resizeObserver?.observe(mapContainer);
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 120 }), "bottom-left");
    map.addControl(new maplibregl.FullscreenControl({ container: mapContainer.parentElement! }), "top-right");

    map.on("error", (event) => {
      setMapError(event.error?.message ?? "Erro no mapa.");
    });

    map.on("load", () => {
      updateComparisonView();
      map.addSource("municipality-boundary", {
        type: "geojson",
        data: studyArea.boundary,
        attribution: "IBGE, Censo 2022"
      });
      map.addSource("territorial-units", {
        type: "geojson",
        data: EMPTY_COLLECTION
      });

      map.addLayer({
        id: "municipality-boundary-fill",
        type: "fill",
        source: "municipality-boundary",
        paint: {
          "fill-color": "#f0b84f",
          "fill-opacity": 0.06
        }
      });

      map.addLayer({
        id: "municipality-boundary-outline",
        type: "line",
        source: "municipality-boundary",
        paint: {
          "line-color": "#f8d98b",
          "line-opacity": 0.92,
          "line-width": 2.4
        }
      });

      map.addLayer({
        id: "territorial-units-fill",
        type: "fill",
        source: "territorial-units",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "id"], ""],
            "#f0b84f",
            "#8fbdb5"
          ],
          "fill-opacity": [
            "case",
            ["==", ["get", "id"], ""],
            0.08,
            0.03
          ]
        }
      });

      map.addLayer({
        id: "territorial-units-outline",
        type: "line",
        source: "territorial-units",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "id"], ""],
            "#f8d98b",
            "#dcebe6"
          ],
          "line-opacity": 0.95,
          "line-width": [
            "case",
            ["==", ["get", "id"], ""],
            3,
            1
          ]
        }
      });

      map.addSource("focused-locality", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({ id: "focused-locality-outline", type: "line", source: "focused-locality",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "line-color": "#e4b5ff", "line-width": 3.5, "line-dasharray": [3, 2] } });
      map.addLayer({ id: "focused-locality-point", type: "circle", source: "focused-locality",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-color": "#e4b5ff", "circle-radius": 9, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });

      map.on("click", (event) => {
        const inspectableLayers = map.getStyle().layers.filter((layer) => layer.id.startsWith(OVERLAY_PREFIX) && layer.type !== "raster").map((layer) => layer.id);
        const features = map.queryRenderedFeatures(event.point, { layers: inspectableLayers }).filter((feature) => feature.properties?.sourceUrl && (!feature.properties.localityId || onSelectLocalityRef.current));
        const evidence = features.find((feature) => !feature.properties?.localityId) ?? features[0];
        if (typeof evidence?.properties?.localityId === "string" && onSelectLocalityRef.current) {
          onSelectLocalityRef.current(evidence.properties.localityId);
          return;
        }
        if (evidence) {
          showFeaturePopup(map, featurePopup(evidence.properties, [event.lngLat.lng, event.lngLat.lat]));
          return;
        }
        const feature = map.queryRenderedFeatures(event.point, { layers: ["territorial-units-fill"] })[0];
        const nextUnitId = feature?.properties?.id;

        if (typeof nextUnitId === "string") {
          onSelectUnitRef.current(nextUnitId);
        }
      });

      map.on("mouseenter", "territorial-units-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "territorial-units-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
    });

    return () => {
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [studyArea]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapLoaded) {
      return;
    }

    const unitsSource = map.getSource("territorial-units") as
      | GeoJSONSource
      | undefined;
    unitsSource?.setData(unitCollection);
    updateTerritorialSelectionPaint(map, selectedUnitId);
    if (inspectionMode) map.setPaintProperty("territorial-units-fill", "fill-opacity", 0);
  }, [
    mapLoaded,
    selectedUnitId,
    unitCollection,
    inspectionMode
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    map.setPaintProperty("reference-imagery", "raster-brightness-max", inspectionMode ? 1 : 0.72);
    map.setPaintProperty("reference-imagery", "raster-brightness-min", inspectionMode ? 0 : 0.08);
    map.setPaintProperty("reference-imagery", "raster-opacity", inspectionMode ? 1 : 0.88);
    map.setPaintProperty("reference-imagery", "raster-saturation", inspectionMode ? 0 : -0.45);
    map.setPaintProperty("municipality-boundary-fill", "fill-opacity", inspectionMode ? 0 : 0.06);
  }, [mapLoaded, inspectionMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("focused-locality") as GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: focusedLocality ? [focusedLocality.geometry] : [] });
  }, [focusedLocality, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const control = new maplibregl.AttributionControl({ compact: true, customAttribution: [...new Set(activeLayers.filter((layer) => layer.image && layer.attribution).map((layer) => layer.attribution!))] });
    map.addControl(control, "bottom-right");
    return () => { if (map.hasControl(control)) map.removeControl(control); };
  }, [mapLoaded, activeLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    syncOverlayLayers(map, activeLayers, overlayCollections);
    const markers: maplibregl.Marker[] = [];
    const popups: maplibregl.Popup[] = [];
    for (const collection of Object.values(overlayCollections)) {
      for (const feature of collection.features) {
        if (feature.geometry.type !== "Point" || !feature.properties?.markerNumber) continue;
        const coordinates = feature.geometry.coordinates.slice(0, 2) as [number, number];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "protected-marker";
        button.textContent = String(feature.properties.markerNumber);
        button.setAttribute("aria-label", `Ver ${feature.properties.name}`);
        button.title = String(feature.properties.name);
        const popup = featurePopup(feature.properties, coordinates);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          popups.forEach((other) => other.remove());
          showFeaturePopup(map, popup);
        });
        popups.push(popup);
        markers.push(new maplibregl.Marker({ element: button }).setLngLat(coordinates).addTo(map));
      }
    }
    return () => { markers.forEach((marker) => marker.remove()); popups.forEach((popup) => popup.remove()); };
  }, [mapLoaded, activeLayers, overlayCollections]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapLoaded) {
      return;
    }

    if (focusedLocality) {
      const bounds = getGeometryBounds(focusedLocality.geometry.geometry);
      if (bounds) fitMapToBounds(map, bounds, { maxZoom: 15, padding: 72 });
      return;
    }

    const selectedBounds = selectedUnit
      ? getGeometryBounds(selectedUnit.geometry.geometry)
      : null;
    const viewportUnitBounds = viewportUnit
      ? getGeometryBounds(viewportUnit.geometry.geometry)
      : null;
    const fallbackBounds =
      getFeatureCollectionBounds(unitCollection) ?? studyArea.bounds;

    if (selectionRevision === 0) {
      if (!hasFitInitialViewportRef.current) {
        const initialBounds =
          viewportUnitBounds ??
          studyArea.bounds;

        fitMapToBounds(map, initialBounds, {
          animate: false,
          maxZoom: getMaxZoomForSelection(viewportUnit),
          padding: viewportUnit ? 72 : 36
        });
        hasFitInitialViewportRef.current = true;
      }

      return;
    }

    const focusedUnit = viewportUnit ?? selectedUnit;
    const focusedBounds = viewportUnitBounds ?? selectedBounds;

    fitMapToBounds(map, focusedBounds ?? fallbackBounds, {
      maxZoom: getMaxZoomForSelection(focusedUnit),
      padding: focusedUnit ? 72 : 48
    });
  }, [
    mapLoaded,
    studyArea,
    selectedUnit,
    selectionRevision,
    unitCollection,
    viewportUnit,
    focusedLocality
  ]);

  return (
    <section className="map-panel" aria-label="Mapa de exploração geográfica">
      <div className="map-panel__controls">
      <div className="map-panel__meta">
        <span>São João de Meriti</span>
        <span>{units[0]?.unitType === "neighborhood" ? "Bairros do IBGE" : "Limites do IBGE"}</span>
        <span>{units.length} unidades</span>
        {focusedLocality && <span>{focusedLocality.name} · referência aproximada</span>}
        <span>
          {activeLayers.length > 0 && loadingOverlays
            ? "carregando camadas"
            : activeLayers.length > 0
              ? `${activeLayers.length} sobreposição(ões)`
              : "sem sobreposição"}
        </span>
      </div>
      {inspectionMode && <div className="map-inspection-note">
        <strong>Foto detalhada · Esri</strong>
        <span>Aproxime com + ou a roda do mouse. Use tela cheia para inspecionar as copas.</span>
        <small>A data e o detalhe variam por local. Zoom adicional amplia a imagem; não cria novas medições de vegetação.</small>
      </div>}
      <GoogleMapComparison view={comparisonView} onToggle={(open) => { if (open) setComparisonMarker(true); }} />
      <details className="map-legend" aria-label="Legenda">
        <summary>Legenda · {activeLayers.length} camadas</summary>
        <div className="map-legend__content">
        <div className="legend-group">
          <strong>Unidades territoriais</strong>
          <span>
            <i style={{ background: "#f8d98b" }} aria-hidden="true" />
            Seleção ativa
          </span>
          <span>
            <i style={{ background: "#8fbdb5" }} aria-hidden="true" />
            Filtro territorial visível
          </span>
        </div>
        {activeLayers.length === 0 ? (
          <span>Nenhuma sobreposição ativa</span>
        ) : (
          activeLayers.map((layer) => (
            <div className="legend-group" key={layer.id}>
              <strong>{layer.label} · {layer.timelineReady ? year : layer.temporalCoverage}</strong>
              {layer.legend.map((item) => (
                <span key={item.label}>
                  <i style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
                </span>
              ))}
            </div>
          ))
        )}
        </div>
      </details>
      </div>
      {mapError || overlayErrors.length > 0 ? <div className="map-error" role="alert">{[mapError, ...overlayErrors].filter(Boolean).join(" ")} As demais camadas continuam disponíveis.</div> : null}
      <div ref={mapContainerRef} className="map-canvas" />
      {comparisonMarker && <div className="map-comparison-crosshair" aria-hidden="true" />}
    </section>
  );
}

function updateTerritorialSelectionPaint(
  map: maplibregl.Map,
  selectedUnitId: string
) {
  if (!map.getLayer("territorial-units-fill")) {
    return;
  }

  map.setPaintProperty("territorial-units-fill", "fill-color", [
    "case",
    ["==", ["get", "id"], selectedUnitId],
    "#f0b84f",
    "#8fbdb5"
  ]);
  map.setPaintProperty("territorial-units-fill", "fill-opacity", [
    "case",
    ["==", ["get", "id"], selectedUnitId],
    0.08,
    0.03
  ]);
  map.setPaintProperty("territorial-units-outline", "line-color", [
    "case",
    ["==", ["get", "id"], selectedUnitId],
    "#f8d98b",
    "#dcebe6"
  ]);
  map.setPaintProperty("territorial-units-outline", "line-width", [
    "case",
    ["==", ["get", "id"], selectedUnitId],
    3,
    1
  ]);
}

function syncOverlayLayers(
  map: maplibregl.Map,
  activeLayers: EvidenceLayer[],
  overlayCollections: Record<string, FeatureCollection<Geometry>>
) {
  removeOverlayLayers(map);

  activeLayers.forEach((layer, index) => {
    const sourceId = `${OVERLAY_PREFIX}-${layer.id}`;
    if (layer.image) {
      map.addSource(sourceId, { type: "image", url: evidenceAssetUrl(layer), coordinates: layer.image.coordinates });
      map.addLayer({ id: `${sourceId}-raster`, type: "raster", source: sourceId, paint: { "raster-opacity": 0.9, "raster-resampling": "nearest", "raster-fade-duration": 0 } }, layer.image.role === "reference" ? "municipality-boundary-fill" : "territorial-units-fill");
      return;
    }
    const collection = overlayCollections[layer.id];

    if (!collection || collection.features.length === 0) {
      return;
    }

    const opacity = Math.max(0.22, 0.46 - index * 0.05);
    map.addSource(sourceId, {
      type: "geojson",
      data: collection,
      attribution: layer.attribution ?? (layer.sourceDatasetIds.some((id) => id.startsWith("osm__"))
        ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors, ODbL</a>'
        : layer.sourceDatasetIds.some((id) => id.startsWith("mapbiomas__"))
          ? "MapBiomas, coleção 2 beta, 10 m"
          : layer.sourceDatasetIds.some((id) => id.startsWith("sgb__"))
            ? "SGB/CPRM, 2015"
            : "IBGE, Censo 2022")
    });

    if (hasGeometryType(collection, ["Polygon", "MultiPolygon"])) {
      map.addLayer(
        {
          id: `${sourceId}-fill`,
          type: "fill",
          source: sourceId,
          filter: [
            "match",
            ["geometry-type"],
            ["Polygon", "MultiPolygon"],
            true,
            false
          ],
          paint: {
            "fill-color": ["coalesce", ["get", "overlayColor"], "#6c918b"],
            "fill-opacity": layer.rendering?.fillOpacity ?? opacity
          }
        },
        "territorial-units-fill"
      );
      map.addLayer(
        {
          id: `${sourceId}-outline`,
          type: "line",
          source: sourceId,
          filter: [
            "match",
            ["geometry-type"],
            ["Polygon", "MultiPolygon"],
            true,
            false
          ],
          paint: {
            "line-color": ["coalesce", ["get", "overlayColor"], "#dbe8e2"],
            "line-opacity": 0.72,
            "line-width": layer.rendering ? 2 : 0.8,
            ...(layer.rendering?.lineDasharray ? { "line-dasharray": layer.rendering.lineDasharray } : {})
          }
        },
        "territorial-units-fill"
      );
    }

    if (hasGeometryType(collection, ["LineString", "MultiLineString"])) {
      map.addLayer(
        {
          id: `${sourceId}-line`,
          type: "line",
          source: sourceId,
          filter: [
            "match",
            ["geometry-type"],
            ["LineString", "MultiLineString"],
            true,
            false
          ],
          paint: {
            "line-color": ["coalesce", ["get", "overlayColor"], "#3b84a5"],
            "line-opacity": 0.86,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8,
              0.8,
              12,
              2.2
            ]
          }
        },
        "territorial-units-fill"
      );
    }

    if (hasGeometryType(collection, ["Point", "MultiPoint"]) && !collection.features.some((feature) => feature.properties?.markerNumber)) {
      map.addLayer(
        {
          id: `${sourceId}-circle`,
          type: "circle",
          source: sourceId,
          filter: [
            "match",
            ["geometry-type"],
            ["Point", "MultiPoint"],
            true,
            false
          ],
          paint: {
            "circle-color": ["coalesce", ["get", "overlayColor"], "#4f8cc9"],
            "circle-opacity": 0.88,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8,
              3,
              12,
              6
            ],
            "circle-stroke-color": "#f8faf7",
            "circle-stroke-width": 0.8
          }
        },
        "territorial-units-fill"
      );
    }
  });
}

function removeOverlayLayers(map: maplibregl.Map) {
  const style = map.getStyle();

  style.layers
    ?.filter((layer) => layer.id.startsWith(OVERLAY_PREFIX))
    .forEach((layer) => {
      if (map.getLayer(layer.id)) {
        map.removeLayer(layer.id);
      }
    });

  Object.keys(style.sources)
    .filter((sourceId) => sourceId.startsWith(OVERLAY_PREFIX))
    .forEach((sourceId) => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });
}

function hasGeometryType(
  collection: FeatureCollection<Geometry>,
  types: Geometry["type"][]
) {
  return collection.features.some((feature) => types.includes(feature.geometry.type));
}

function getFeatureCollectionBounds(collection: FeatureCollection<Geometry>) {
  const bounds = createEmptyRawBounds();

  collection.features.forEach((feature) => {
    extendRawBoundsFromGeometry(bounds, feature.geometry);
  });

  return toBoundsTuple(bounds);
}

function getGeometryBounds(geometry: Geometry) {
  const bounds = createEmptyRawBounds();
  extendRawBoundsFromGeometry(bounds, geometry);

  return toBoundsTuple(bounds);
}

function fitMapToBounds(
  map: maplibregl.Map,
  bounds: BoundsTuple,
  {
    animate = true,
    maxZoom,
    padding
  }: {
    animate?: boolean;
    maxZoom: number;
    padding: number;
  }
) {
  map.resize();

  const [southWest, northEast] = bounds;

  if (
    southWest[0] === northEast[0] &&
    southWest[1] === northEast[1]
  ) {
    if (animate) {
      map.easeTo({
        center: southWest,
        duration: 520,
        zoom: maxZoom
      });
    } else {
      map.jumpTo({
        center: southWest,
        zoom: maxZoom
      });
    }

    return;
  }

  map.fitBounds(bounds, {
    animate,
    duration: 520,
    maxZoom,
    padding
  });
}

function getMaxZoomForSelection(unit: TerritorialUnit | undefined) {
  if (!unit || unit.unitType === "municipality") return 13;
  if (unit.unitType === "district") return 14;
  if (unit.unitType === "neighborhood") return 15;
  return 18;
}

function createEmptyRawBounds() {
  return {
    maxLat: -Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    minLng: Infinity
  };
}

function extendRawBounds(
  bounds: ReturnType<typeof createEmptyRawBounds>,
  longitude: number,
  latitude: number
) {
  if (!isValidCoordinate(longitude, latitude)) {
    return;
  }

  bounds.minLng = Math.min(bounds.minLng, longitude);
  bounds.maxLng = Math.max(bounds.maxLng, longitude);
  bounds.minLat = Math.min(bounds.minLat, latitude);
  bounds.maxLat = Math.max(bounds.maxLat, latitude);
}

function extendRawBoundsFromCoordinates(
  bounds: ReturnType<typeof createEmptyRawBounds>,
  coordinates: unknown
) {
  if (!Array.isArray(coordinates)) {
    return;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    extendRawBounds(bounds, coordinates[0], coordinates[1]);
    return;
  }

  coordinates.forEach((child) => extendRawBoundsFromCoordinates(bounds, child));
}

function extendRawBoundsFromGeometry(
  bounds: ReturnType<typeof createEmptyRawBounds>,
  geometry: Geometry
) {
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((child) => extendRawBoundsFromGeometry(bounds, child));
    return;
  }

  extendRawBoundsFromCoordinates(bounds, geometry.coordinates);
}

function toBoundsTuple(
  bounds: ReturnType<typeof createEmptyRawBounds>
): BoundsTuple | null {
  if (
    !Number.isFinite(bounds.minLng) ||
    !Number.isFinite(bounds.minLat) ||
    !Number.isFinite(bounds.maxLng) ||
    !Number.isFinite(bounds.maxLat)
  ) {
    return null;
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat]
  ];
}

function isValidCoordinate(longitude: number, latitude: number) {
  return Number.isFinite(longitude) && Number.isFinite(latitude) &&
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
}

function getBoundsCenter(bounds: BoundsTuple): [number, number] {
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2
  ];
}
