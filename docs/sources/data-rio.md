# Data.Rio / IPP Source Notes

Primary service verified for administrative boundaries:

- ArcGIS service: `https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Cartografia/Limites_administrativos/FeatureServer`
- Publisher shown by service: Instituto Pereira Passos, PCRJ.
- Layers discovered: municipality, Areas de Planejamento, Regioes de Planejamento, Regioes Administrativas, and Bairros.
- Service CRS reported by the service: EPSG:31983.

Additional municipal ArcGIS layers collected:

- `Meio_Ambiente/Hidrografia`: 3,663 objectIds.
- `Meio_Ambiente/Sub_bacias_hidrograficas`: 55 objectIds.
- `Meio_Ambiente/Pracas`: 4,072 objectIds.
- `Meio_Ambiente/Areas_Protegidas`: 94 objectIds.
- `Educacao/SME` layer `Escolas municipais`: 1,590 objectIds.
- `Hosted/Servicos_de_Saude`: 176 objectIds.
- `Defesa_Civil/Defesa_Civil`: sirenes 163, pontos de apoio 189, NUPDEC 44, alojamentos provisorios 12.

Phase 1 acquisition route:

- Use ArcGIS query URLs with `where=1%3D1`, `outFields=*`, `returnGeometry=true`, and `f=json`.
- Store the raw JSON response exactly as downloaded.
- Treat every download as a dated portal snapshot because the service itself is not a versioned static release.
- For services that exceed `MaxRecordCount`, use `scripts/collect/download_arcgis_layer.py` so the complete layer is captured in objectId batches instead of relying on one capped query response.

Phase 2 notes:

- Use the AP layer for the AP3 study scope and AP filter.
- Use RA and neighborhood layers for territorial drilldown.
- Check topology, names, IDs, and CRS before promoting to app-ready territorial units.
- Interpret public-facility layers as contextual opportunity evidence only after verifying ownership, access, geometry type, and update cadence.
