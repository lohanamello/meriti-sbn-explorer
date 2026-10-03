# Alerta Rio Source Notes

Sources discovered:

- Station location metadata through the municipal ArcGIS service: `https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Geotecnia/Estacoes_AlertaRio/FeatureServer/0`
- Current rainfall and meteorological readings page: `http://websempre.rio.rj.gov.br/estacoes/`

Phase 1 acquisition route:

- Download station locations as raw ArcGIS JSON.
- Capture the readings page only as an HTML snapshot unless a stable historical API is confirmed.
- Do not treat a live page snapshot as defensible temporal evidence by itself.

Phase 2 notes:

- Station points can support spatial interpretation of rainfall observations.
- Temporal evidence requires a stable archive, comparable measurement intervals, and missing-data handling.
