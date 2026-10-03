# Phase 1 - Collection

## Purpose

Phase 1 discovers, acquires, stores, and inventories source datasets that may help identify territorial opportunities for nature-based solutions in Rio de Janeiro, with special attention to AP3.

This phase is intentionally broad. It does not decide final analytical value. Its job is to maximize source discovery while preserving provenance and future usability.

## Operating Rule

Collect broadly, reject slowly.

A dataset can be collected even when its value is uncertain. It should be excluded from collection only when it is clearly irrelevant, inaccessible without unavailable credentials, legally unusable, or impossible to preserve with traceable provenance.

## Phase Inputs

- [../../MASTERPLAN.md](../../MASTERPLAN.md)
- [../../CONTEXT.md](../../CONTEXT.md)
- Current project filesystem
- Public data portals and documented source routes
- Any manually supplied files or source links from Victor

## Phase Outputs

Required outputs:

- `data/raw/` with source-preserved raw files
- `data/catalog/dataset-inventory.*` with one record per source dataset
- `docs/sources/` notes for complex source families
- `scripts/collect/` acquisition scripts where feasible
- Blocker notes for unavailable, restricted, broken, or manual-only sources

Optional outputs:

- `data/raw/_manual/` for files that require manual download
- `data/raw/_snapshots/` for portal exports whose URLs are unstable
- `docs/methodology/collection-log.md` for daily or session-level collection notes

## Source Search Scope

Search aggressively across the following source families:

- IBGE and Census products
- ANA hydrological and water-related datasets
- Data.Rio, IPP, Prefeitura do Rio, and other municipal open data sources
- INEA environmental datasets
- MapBiomas land cover and land use products
- Alerta Rio rainfall, weather, and risk-related products
- SNIS sanitation indicators
- SGB/CPRM geoscience and risk-related datasets
- OpenStreetMap and open infrastructure datasets
- Academic, institutional, and public-interest datasets relevant to AP3 or Rio de Janeiro

Do not treat this list as exhaustive. When a source suggests another credible source, follow it and record the path.

## Evidence Families To Tag

Every source dataset should be tagged with at least one evidence family when possible:

- Vulnerability, demographics, and social conditions
- Sanitation and drainage
- Flooding, inundation, and urban water risk
- Vegetation cover and green infrastructure
- Impervious surface and land use
- Public facilities, public land, and intervention opportunity spaces
- Temporal evidence
- Administrative boundaries and territorial reference layers
- Supporting context

## Collection Workflow

1. Identify source family.
2. Locate official or most authoritative access route.
3. Record source metadata before or during download.
4. Download raw data without altering content.
5. Store raw files under a stable source folder.
6. Add or update inventory record.
7. Add acquisition script when the source can be fetched reproducibly.
8. Record blockers and manual steps when automation is not feasible.
9. Continue to the next source instead of stopping on failure.

## Directory Convention

Use stable, lowercase folder names:

```text
data/raw/
  ibge/
  ana/
  data-rio/
  ipp/
  inea/
  mapbiomas/
  alerta-rio/
  snis/
  sgb-cprm/
  osm/
  academic/
  manual/
```

If a source does not fit, add a new folder and document it in the inventory.

## Dataset Inventory Fields

Minimum fields:

- `id`
- `source_name`
- `source_institution`
- `source_url`
- `acquisition_route`
- `access_status`
- `license`
- `spatial_coverage`
- `spatial_resolution`
- `temporal_coverage`
- `format`
- `crs`
- `evidence_family`
- `potential_use`
- `known_limitations`
- `raw_storage_path`
- `collection_status`
- `promotion_status`
- `collected_at`
- `notes`

Recommended status values:

- `discovered`
- `downloaded`
- `manual_required`
- `blocked`
- `unavailable`
- `superseded`

Recommended promotion status values:

- `not_reviewed`
- `candidate`
- `promoted`
- `rejected`
- `deferred`

## Source Acceptance During Collection

Collect when:

- The source has plausible relevance to any evidence family.
- The source has an identifiable institution, author, or publication route.
- The source can be downloaded, referenced, or manually preserved.
- The license is open, unclear but reviewable, or suitable for research notes.

Do not collect when:

- The source is clearly unrelated to Rio, AP3, urban water risk, SBN, health, social vulnerability, land cover, infrastructure, or territorial context.
- The source requires credentials Victor has not authorized.
- The source terms clearly prohibit the intended research use.
- The file cannot be accessed and no citation or metadata can be preserved.

## Quality Gate

Phase 1 is successful when:

- A broad dataset inventory exists.
- Each collected source has provenance.
- Raw files are stored without destructive transformation.
- Major source families have been investigated.
- Blockers are documented rather than silently ignored.
- The next phase can evaluate collected sources without needing to rediscover where they came from.

## Non-Stop Execution Rule

When a source fails:

1. Record the failure in the inventory.
2. Add a blocker note when the reason matters.
3. Preserve any URL, citation, or partial metadata.
4. Move to the next source family.

Do not stop the phase because one source portal is broken, one file is large, one format is inconvenient, or one source requires manual download.

## Handoff To Phase 2

Phase 2 receives:

- Raw files
- Inventory records
- Source notes
- Access limitations
- Initial evidence family tags
- Temporal coverage hints
- Any scripts used to acquire data

Phase 2 decides whether a source becomes prioritization evidence.
