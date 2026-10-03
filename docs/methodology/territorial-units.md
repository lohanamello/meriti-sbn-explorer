# Phase 2 Territorial Units

## Official Units

Phase 2 promotes three Data.Rio territorial layers:

- Planning Areas: 5 units, including AP3.
- Administrative Regions: 33 units.
- Neighborhoods: 166 units.

All processed geospatial outputs are written in EPSG:4326 for web rendering. Raw Data.Rio geometry is preserved under `data/raw/` in EPSG:31983.

## Primary Analytical Unit

The first analytical unit is the official neighborhood.

Reasons:

- It is fine enough for AP3 research communication.
- It is stable enough for a public-facing map.
- Data.Rio hydrography and plazas include neighborhood codes.
- IBGE Census 2022 sector aggregates include `NM_BAIRRO`, which can be harmonized to most official neighborhood names.
- It avoids the current cost and uncertainty of full census-sector polygon processing in the app.

## Census Harmonization

IBGE Census 2022 sector aggregates were grouped by `NM_BAIRRO` and harmonized to Data.Rio neighborhood names.

Name harmonizations applied:

- `Freguesia (Ilha do Governador)` -> `Freguesia (Ilha)`
- `Oswaldo Cruz` -> `Osvaldo Cruz`
- `Sao Cristovao` -> `Imperial de Sao Cristovao`

Four official neighborhoods do not have a direct Census 2022 `NM_BAIRRO` match in the current aggregation:

- Argentino
- Barra Olimpica
- Ilha de Guaratiba
- Jabour

These territories are kept in the processed layers. Their census-dependent components are null, not imputed.

## Drilldown Contract

Phase 3 can support:

- Rio-wide view.
- AP filter, including AP3 quick focus.
- AP -> RA -> neighborhood drilldown.

Census-sector drilldown remains deferred. The raw IBGE GeoPackages are preserved and can support a later sector-level pass, but Phase 2 does not expose sector geometries as app-ready overlays yet.

## Spatial Joins And Allocation

The curation uses three assignment methods:

- direct source code joins, when Data.Rio provides a neighborhood code;
- point-in-polygon allocation for facility and civil-defense point layers;
- centroid allocation for SGB/CPRM susceptibility polygons and protected-area context.

Centroid allocation is acceptable for screening and map explanation. It is not suitable for parcel-scale hazard quantification.

