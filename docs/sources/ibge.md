# IBGE Source Notes

High-priority source families:

- Malha de Setores Censitarios 2022 for RJ.
- Agregados por Setores Censitarios 2022 with malha/attributes for RJ.
- Documentation and data dictionaries for Censo 2022 sector aggregates.

Phase 1 acquisition route:

- Prefer official IBGE/FTP URLs over secondary mirrors.
- Store GeoPackage files under `data/raw/ibge/<dataset-id>/`.
- Keep documentation PDFs/HTML snapshots with provenance when they are used to interpret variables.

Phase 2 notes:

- Census Sector is the preferred fine-grained analytical unit when source resolution allows it.
- Confirm CRS from each file rather than assuming it from the download page.
- Inspect comparability notes before mixing preliminary and final sector products.
