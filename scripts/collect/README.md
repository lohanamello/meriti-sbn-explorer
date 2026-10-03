# Phase 1 Collection Scripts

Run commands from the project root.

## Initialize directories

```powershell
python .\scripts\collect\init_collection.py
```

## Validate the inventory

```powershell
python .\scripts\collect\validate_inventory.py --strict
```

## Download one inventory source

```powershell
python .\scripts\collect\download_source.py data-rio__limites_ap__atual --filename limites_ap.json
```

The downloader:

- reads the row from `data/catalog/dataset-inventory.csv`;
- stores the raw response under `raw_storage_path`;
- writes `provenance.json` with timestamp, bytes, content type, and sha256;
- marks the inventory row as `downloaded`.

Use `--allow-large` only for intentionally large sources such as SGB/CPRM vector packages.

For large direct downloads that may disconnect, use the resumable downloader:

```powershell
python .\scripts\collect\download_resumable.py sgb-cprm__rio_suscetibilidade_sig_zip__2018 --filename sig_riodejaneiro_rj_suscet.zip
```

For ArcGIS layers that may exceed `MaxRecordCount`, use the objectId-batched downloader:

```powershell
python .\scripts\collect\download_arcgis_layer.py data-rio__hidrografia__atual --filename hidrografia_arcgis_capture.json
```

## Register or update a source

```powershell
python .\scripts\collect\register_source.py --id family__dataset__period --set collection_status=manual_required --set notes="Requires authorized manual export."
```

Do not use fake identity data or bypass portal access requirements. Record those cases in the inventory and in `docs/sources/manual-access-todos.md`.

## Download a public Google Drive file

```powershell
python .\scripts\collect\download_google_drive.py academic__cem_setores_rm_rio_zip__2022 --filename SC2022_RMRIO_CEM_V1.zip
```

## Download an Overpass extract

```powershell
python .\scripts\collect\download_overpass.py osm__rio_openstreetmap_extract__atual --query-file scripts\collect\overpass_queries\rio_nbs_context.overpassql --filename rio_nbs_context_overpass.json
```

## Download SNIS Rio AE aggregate JSON

```powershell
python .\scripts\collect\download_snis_rio_ae.py snis__serie_historica_rio_agregado_ae__1995_2022
```
