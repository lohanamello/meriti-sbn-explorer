# ANA / HidroWeb Source Notes

Primary source family:

- HidroWeb / SNIRH historical hydrometeorological data.

Phase 1 acquisition route:

- Start with station discovery for Rio de Janeiro municipality and surrounding drainage basins.
- Prefer official API or export routes if documented and stable.
- If station-level downloads require interactive selection, record manual steps instead of blocking the phase.
- SNIRH exposes an ArcGIS service for hydrometeorological station inventory. Use the RJ-filtered query captured in the inventory before downloading station-level time series.
- Downloaded the RJ station inventory as `ana__snirh_estacoes_hidrometeorologicas_rj__atual`.

Phase 2 notes:

- Station time series can support rainfall, river level, and hydrological context.
- Temporal evidence must document missing values, station relocation, measurement cadence, and station relevance to AP3.
- Time-series downloads should be selected after station filtering; the Phase 1 inventory only confirms the public station layer and HidroWeb route.
