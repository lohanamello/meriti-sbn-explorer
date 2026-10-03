# Manual Access Todos

These items should not block Phase 1 execution. Keep moving through other sources, then return to these with explicit authorization or manual action.

## Identity, Login, Or Personal Registration

- Do not generate or use fake CPF, login, or personal identity data.
- If a public portal requires CPF or gov.br login, mark the source as `manual_required` and ask Victor to complete the access path or explicitly provide an authorized route.
- Preserve the source URL, reason, and expected dataset in `dataset-inventory.csv`.
- This Phase 1 run did not use or store any CPF, login, or personal credential.

## Large Files

- Completed: IBGE RJ GeoPackage files were downloaded and kept outside Git through `data/raw/**` ignore rules.
- Completed: SGB/CPRM SIG ZIP and MDE ZIP were downloaded. The SIG ZIP required `download_resumable.py` and was checked as a readable ZIP.
- Completed: MapBiomas 10 m national GeoTIFFs for 2019-2023 were downloaded. They are intentionally raw national rasters and should not be committed.

## Portal-Mediated Exports

- Completed: `mapbiomas__cobertura_uso_solo_10m__colecao2_beta` page and 2019-2023 GeoTIFF routes were captured. Phase 2 still needs a Rio/AP3 clipping strategy before analysis.
- Completed: `snis__serie_historica_saneamento__1995_atual` page was captured and `snis__serie_historica_rio_agregado_ae__1995_2022` was exported through the public app AJAX flow.
- `sinisa__saneamento_basico__2024_atual`: confirm current data availability and schema after the SNIS to SINISA transition.
- `inea__geoinea_camadas_ambientais__atual`: inspect each layer and record layer-specific license, CRS, format, and download URL.
- `ceperj__iderj_geoservicos__atual`: inspect each OGC service/layer before adding dataset-level rows.
- Completed: Data.Rio municipal ArcGIS layers for hydrography, sub-basins, public open spaces, public facilities, and Defesa Civil support infrastructure were captured with paginated objectId batches.

## Follow-Up Records To Add

- INEA/GeoInea layer-level records after metadata and route review.
- IDE.RJ/CEPERJ layer-level records after OGC service review.
- SINISA structured data records once a stable public export route is confirmed.
- Academic AP3-specific sources only when they have citable metadata and permissible reuse.
