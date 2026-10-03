# Collection Log

## 2026-05-17

Implemented the Phase 1 collection scaffold.

- Created the raw-data, catalog, source-notes, and collection-script structure.
- Seeded `data/catalog/dataset-inventory.csv` with broad source families for Rio de Janeiro and AP3-oriented evidence discovery.
- Marked large, manual, or portal-mediated sources as `manual_required` or `deferred` instead of blocking the phase.
- Added scripts for directory initialization, source registration, direct downloads with provenance, and inventory validation.
- Policy decision: do not generate fake identity data or bypass credential gates. Sources requiring CPF, login, or a personal account must be recorded as manual tasks for Victor or handled through authorized credentials.

Initial small downloads completed:

- `data-rio__limites_ap__atual`: `data/raw/data-rio/data-rio__limites_ap__atual/limites_ap.json`, 1,932,865 bytes, sha256 `1487d1a593a4a50edc5d704e82ebba0321d87c842d0e1c251c85630d70aa5b64`.
- `data-rio__limites_ra__atual`: `data/raw/data-rio/data-rio__limites_ra__atual/limites_ra.json`, 2,723,386 bytes, sha256 `6af6621be823f65dd18ae39960c65b8c963a505bd2d85bff57db7712e2c94dae`.
- `data-rio__limites_bairros__atual`: `data/raw/data-rio/data-rio__limites_bairros__atual/limites_bairros.json`, 3,943,415 bytes, sha256 `264906655e2312d4b100884acbbb184cbf7c664e3a3d131ad439ead0e22c4c02`.
- `data-rio__alerta_rio_estacoes__atual`: `data/raw/data-rio/data-rio__alerta_rio_estacoes__atual/alerta_rio_estacoes.json`, 5,723 bytes, sha256 `11a730c6bd90c9b6867a1bdd4633985c1a525384b7d3b24bb0970fea2371c9c7`.
- `alerta-rio__chuva_tempo_real__snapshot`: `data/raw/alerta-rio/alerta-rio__chuva_tempo_real__snapshot/alerta_rio_estacoes_snapshot.html`, 73,257 bytes, sha256 `182083cb3a5b11b9abbf10ba75e81a428c132b42464bb34ccd266b1ffb0ac869`.

Each downloaded source has `provenance.json` in its raw storage folder.

Expanded public-source collection completed in the same session.

- Inventory now has 42 records and all are `downloaded`.
- `data/raw/` currently contains 42 `provenance.json` files and 28,944,243,454 bytes of raw artifacts.
- No CPF, login, generated identity data, or credentialed route was used or stored.
- No `data/interim/` or `data/processed/` output was created for Phase 1.

Additional public downloads completed by source family:

- Data.Rio / Prefeitura ArcGIS layers: hidrografia, sub-bacias hidrograficas, pracas, areas protegidas, escolas municipais, servicos de saude, sirenes, pontos de apoio, NUPDEC, and alojamentos provisorios. The paginated ArcGIS capture counts are recorded in each `provenance.json`.
- IBGE: RJ 2022 census-sector malha GeoPackage, RJ 2022 census-sector aggregates GeoPackage, and the Censo 2022 aggregate documentation page snapshot.
- ANA / SNIRH: HidroWeb page snapshot and RJ hydrometeorological station inventory from the public ArcGIS service.
- SGB / CPRM: RIGeo item page, susceptibility map PDF, SIG ZIP, MDE ZIP, license text, extracted PDF text, thumbnail, and SGB risk-cartography page snapshot. The large SIG ZIP was completed through the resumable downloader and validated as a readable ZIP.
- MapBiomas: collection page snapshot and national 10 m GeoTIFFs for 2019, 2020, 2021, 2022, and 2023.
- SNIS / SINISA: SNIS and SINISA public page snapshots plus an automated public SNIS Serie Historica Rio AE JSON export for 1995-2022.
- OSM: Overpass extraction for water, green-space, amenity, and infrastructure context using the saved query in `scripts/collect/overpass_queries/`.
- Academic / institutional: CEM/USP RM Rio page snapshot and public Google Drive ZIP.
- INEA and IDE.RJ/CEPERJ: official portal snapshots captured; layer-level extraction remains a documented Phase 1 follow-up because those catalogs need per-layer metadata review.

## Remaining Collection Follow-Ups

1. Review INEA/GeoInea and IDE.RJ/CEPERJ layer by layer before adding specific analytical datasets.
2. Resolve SINISA data export/API routes beyond the public landing page.
3. Download ANA/HidroWeb time series only after Phase 2 selects relevant station IDs and indicators.
4. Clip, inspect CRS, and harmonize large rasters/vectors only in Phase 2.
