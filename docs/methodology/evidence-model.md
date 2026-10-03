# Phase 2 Evidence Model

## Purpose

Phase 2 promotes source datasets into prioritization evidence only when they are readable, traceable, spatially harmonizable, and useful for interpreting urban water risk or nature-based-solution opportunity in Rio de Janeiro.

The processed contract for Phase 3 is:

- `data/processed/phase3-app-data.json`: app-ready bundle with territorial units, evidence layer metadata, score components, opportunity summaries, solution-class mapping references, and layer file paths.
- `data/processed/layers/*.geojson`: EPSG:4326 map layers for MapLibre or equivalent web rendering.
- `data/processed/evidence/*.json` and `.csv`: score components, solution mappings, temporal sanitation context, and opportunity summaries.
- `data/processed/metadata/*.json`: provenance and quality reports.

## Promoted Evidence Families

Promoted datasets in this pass:

- Official territorial units: Planning Areas, Administrative Regions, and neighborhoods from Data.Rio.
- Census exposure: IBGE Census 2022 sector aggregates, harmonized to official neighborhoods.
- Flood and susceptibility context: SGB/CPRM 2018 SIG vectors, with inundation classes allocated to neighborhoods.
- Drainage context: Data.Rio hydrography, including covered/open watercourse flag and length.
- Green/public space context: Data.Rio plazas and protected areas.
- Public opportunity anchors: municipal schools and health services.
- Civil-defense context: sirens, support points, NUPDEC, and shelters.
- Monitoring context: Alerta Rio station locations.
- Sanitation temporal context: SNIS Rio AE provider/year export, promoted as context only.

## Deferred Or Rejected Sources

Deferred sources remain in the catalog because they may be useful later but are not yet methodologically safe for the main map:

- MapBiomas 10 m GeoTIFFs: require raster zonal statistics, class dictionary validation, and consistent multi-year processing.
- INEA and IDE.RJ: captured as routes/pages, but individual layers still need extraction.
- ANA HidroWeb: needs station and indicator selection before time-series use.
- SINISA: needs a structured route beyond the public page.
- OSM Overpass extract: needs tag filtering, deduplication, and attribution review.
- SGB MDE/PDF/reference records: useful context, but the SIG vectors are the analyzable source.

Rejected records are non-analytical captures such as thumbnail/license-only records or empty station captures.

## Layer Semantics

The Phase 3 map should treat promoted layers differently:

- Territorial units are reference geometry, not evidence.
- `urban-water-prioritization-score` is the first composite screening layer.
- `flood-susceptibility-context`, `drainage-hydrography-pressure`, `social-exposure-census2022`, and `green-public-space-deficit` are score component evidence.
- `civil-defense-risk-context` and `public-facility-opportunity-anchors` support interpretation and solution-class mapping.
- `snis-sanitation-temporal-context` is not timeline-ready and should not be drawn as a neighborhood overlay.

## Contract Notes For Phase 3

Phase 3 should render only promoted evidence layers in the primary map workspace. Deferred/rejected sources should appear in the data catalog for transparency, not as selectable primary overlays.

The app should expose the distinction between:

- source dataset;
- promoted prioritization evidence;
- derived score component;
- solution class.

