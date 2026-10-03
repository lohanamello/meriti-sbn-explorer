# São João de Meriti: adaptação ativa

A execução atual segue [o protocolo de Meriti](./docs/phases/meriti-execution.md) e [a metodologia e limitações](./docs/methodology/meriti.md). Victor confirmou os bairros do IBGE e decidiu usar apenas indicadores, sem pontuação composta. O plano abaixo registra o projeto original do Rio, cujos dados permanecem preservados.

# Rio Nature-Based Solutions Explorer - Masterplan

## Operating Principles

1. Collect broadly.
2. Curate what is analytically useful.
3. Document with technical rigor.
4. Build a visually strong and technically useful app.

## Research Anchor

This project supports a master's research workflow focused on identifying territorial opportunities for nature-based solutions in Rio de Janeiro, with special attention to AP3.

The app must serve both technical analysis and science communication. It should expose rigorous evidence without becoming illegible to non-specialist audiences.

## Product Objective

Build a web app where users can explore Rio de Janeiro through a map workspace, filter by Planning Area, overlay geographic evidence, select the active territorial unit, and inspect a territorial opportunity card that explains risk, evidence, and suggested solution classes.

## Phases

### Phase 1 - Collection

Control document: [Phase 1 - Collection](./docs/phases/phase-1-collection.md)

Goal: discover, acquire, and inventory as many plausible source datasets as possible without rejecting sources too early.

### Phase 2 - Data Curation

Control document: [Phase 2 - Data Curation](./docs/phases/phase-2-data-curation.md)

Goal: evaluate, clean, harmonize, and transform source datasets into defensible prioritization evidence.

### Phase 3 - Implementation

Control document: [Phase 3 - Implementation](./docs/phases/phase-3-implementation.md)

Goal: build the user-facing web app and analytical interaction layer from curated evidence.

## Phase Interface Rules

Each phase has its own control document with objectives, inputs, outputs, workflow, quality gates, and continuation rules.

The phases are sequential in emphasis but not isolated:

- Phase 1 must collect data in forms that can flow into Phase 2 and Phase 3.
- Phase 2 must preserve provenance from Phase 1 and produce app-ready evidence for Phase 3.
- Phase 3 must expose only curated evidence in the main map while keeping the broader data catalog available for transparency.
- Any implementation choice that changes data requirements must update the relevant phase document.

## Target Architecture

The collection phase must be shaped by the intended implementation architecture.

Proposed structure:

```text
data/
  raw/
  interim/
  processed/
  catalog/
scripts/
  collect/
  curate/
  validate/
src/
  app/
  components/
  data/
  lib/
docs/
  phases/
  methodology/
  sources/
```

The exact framework and storage choices will be decided after confirming data volume, geospatial processing needs, and deployment expectations.

## Evidence Families

Initial evidence families:

- Vulnerability, demographics, and social conditions
- Sanitation and drainage
- Flooding, inundation, and urban water risk
- Vegetation cover and green infrastructure
- Impervious surface and land use
- Public facilities, public land, and intervention opportunity spaces
- Temporal evidence where historical comparison is defensible

## Source Strategy

Candidate source families to investigate during collection:

- IBGE and Census products
- ANA hydrological and water-related datasets
- Rio de Janeiro municipal open data and IPP/Data.Rio products
- INEA environmental datasets
- MapBiomas land cover and land use products
- Alerta Rio and climate/rainfall-related sources
- SNIS sanitation indicators
- SGB/CPRM geoscience and risk-related datasets
- OpenStreetMap and other open infrastructure datasets
- Academic or institutional datasets relevant to AP3 and Rio de Janeiro

All source availability, licensing, update cadence, and download routes must be verified during collection.

## Dataset Inventory Fields

Minimum metadata for each source dataset:

- Source name
- Source institution
- URL or acquisition route
- Access status
- License or use restriction
- Spatial coverage
- Spatial resolution
- Temporal coverage
- File format
- Coordinate reference system when applicable
- Evidence family
- Potential use
- Known limitations
- Collection status
- Promotion status
- Notes

## Promotion Criteria

A source dataset can become prioritization evidence when it:

- Covers Rio de Janeiro or AP3 at a useful spatial scale
- Has traceable provenance
- Supports one or more evidence families
- Can be spatially harmonized with the active territorial units
- Improves interpretation of urban water risk or nature-based solution opportunity
- Has limitations that can be documented clearly

## Non-Stop Execution Rule

During implementation, the agent should not stop because one source is unavailable, one dataset is messy, or one task is larger than expected.

When blocked, the agent must:

1. Document the blocker.
2. Preserve any partial progress.
3. Continue with the next available source or task.
4. Keep the masterplan and data catalog current.

Stopping is appropriate only for missing permissions, unavailable required credentials, destructive action approval, or a decision that materially changes the research direction.
