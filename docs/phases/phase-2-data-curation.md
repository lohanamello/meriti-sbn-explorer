# Phase 2 - Data Curation

## Purpose

Phase 2 evaluates, cleans, harmonizes, transforms, and promotes source datasets into defensible prioritization evidence.

This phase converts broad collection into analytical material. It is where methodological rigor is enforced.

## Operating Rule

Promote evidence, not files.

A collected dataset is not automatically useful because it exists. It becomes prioritization evidence only when it can support territorial interpretation with documented provenance, limitations, and transformation logic.

## Phase Inputs

- [../../MASTERPLAN.md](../../MASTERPLAN.md)
- [../../CONTEXT.md](../../CONTEXT.md)
- [./phase-1-collection.md](./phase-1-collection.md)
- `data/raw/`
- `data/catalog/dataset-inventory.*`
- `docs/sources/`
- Collection scripts and blocker notes

## Phase Outputs

Required outputs:

- `data/interim/` cleaned but not final analytical files
- `data/processed/` app-ready and analysis-ready evidence
- `scripts/curate/` transformation scripts
- `scripts/validate/` validation scripts
- Promotion decisions in the dataset inventory
- Methodology notes for derived evidence
- Uncertainty and limitation notes

Optional outputs:

- `docs/methodology/evidence-model.md`
- `docs/methodology/scoring-model.md`
- `docs/methodology/territorial-units.md`
- `docs/methodology/uncertainty.md`

## Core Tasks

### 1. Validate source integrity

Check:

- File readability
- Format consistency
- CRS and spatial validity
- Attribute schema
- Temporal fields
- Missing values
- Duplicates
- Geometry validity
- Coverage of Rio, AP3, or relevant territorial units

### 2. Harmonize spatial data

Target requirements:

- Use a consistent CRS for processed app-ready data.
- Preserve original CRS in metadata.
- Normalize boundaries for Planning Area, neighborhood, administrative region, and Census Sector where available.
- Support territorial drilldown from AP to finer units.
- Track spatial joins and aggregation assumptions.

### 3. Harmonize temporal data

Temporal evidence is allowed only when comparison is defensible.

Check:

- Comparable measurement definitions
- Comparable spatial units or documented crosswalks
- Stable time intervals or clearly irregular periods
- Known changes in collection methods
- Missing years or discontinuities

### 4. Derive prioritization evidence

Potential derived evidence includes:

- Social vulnerability indicators
- Drainage and sanitation deficiency signals
- Flooding or inundation exposure signals
- Vegetation deficit signals
- Impervious surface signals
- Public opportunity space signals
- Composite urban water risk components

Each derived signal must record:

- Input datasets
- Transformation steps
- Assumptions
- Spatial unit
- Temporal reference
- Limitations
- Whether it can feed the prioritization score

### 5. Promote, reject, or defer sources

Promotion status values:

- `promoted`: used as prioritization evidence
- `rejected`: not analytically useful or methodologically unsafe
- `deferred`: potentially useful but requires more work or external confirmation
- `candidate`: promising but not yet fully validated
- `not_reviewed`: not evaluated yet

## Promotion Criteria

A source dataset can be promoted when it:

- Covers Rio de Janeiro or AP3 at a useful spatial scale
- Has traceable provenance
- Supports one or more evidence families
- Can be spatially harmonized with active territorial units
- Improves interpretation of urban water risk or SBN opportunity
- Has limitations that can be clearly documented
- Does not create severe distortion when aggregated or compared

## Rejection Criteria

Reject or defer when:

- Spatial coverage is too coarse for the intended use.
- Temporal comparison would be misleading.
- Provenance is weak or absent.
- Licensing prevents use.
- Data quality problems cannot be responsibly mitigated.
- The signal duplicates stronger evidence without adding interpretive value.

Rejection must be documented. Rejected sources remain visible in the data catalog for transparency.

## Prioritization Score Development

The first score should focus on urban water risk.

Initial components to test:

- Exposure to flooding or inundation
- Drainage and sanitation stress
- Social vulnerability
- Vegetation deficit
- Impervious surface or land use pressure
- Presence of opportunity spaces for SBN

The score must remain explainable. Avoid black-box weighting unless the methodology is explicitly documented and defensible.

## Solution Class Mapping

Phase 2 should prepare the rule base or evidence mapping that allows Phase 3 to suggest solution classes.

Initial solution classes may include:

- Rain gardens and bioretention
- Permeable surfaces
- Street tree planting and shade corridors
- Riparian restoration
- Floodable parks and retention areas
- Constructed wetlands
- Green roofs on public facilities
- Urban micro-parks and pocket green infrastructure

Each mapping should connect evidence patterns to solution classes. Example:

- High imperviousness + drainage stress + public right-of-way presence may suggest bioretention or permeable surface interventions.
- Low vegetation + high heat or vulnerability signals may suggest street tree planting and shade corridors.

## Quality Gate

Phase 2 is successful when:

- Promoted evidence is reproducible from raw or interim data.
- Each promoted evidence layer has provenance and limitations.
- Processed data can support map overlays.
- The active territorial units are supported.
- Temporal evidence is clearly marked as comparable or non-comparable.
- The first urban water risk score is explainable.
- Solution class mappings are documented enough for implementation.

## Non-Stop Execution Rule

When a dataset cannot be curated:

1. Mark it as `rejected` or `deferred`.
2. Explain why.
3. Preserve the raw source and metadata.
4. Continue curating the next dataset.

Do not stop because one source is messy, one geometry is invalid, one indicator requires later refinement, or one transformation needs manual review.

## Handoff To Phase 3

Phase 3 receives:

- Processed geospatial layers
- Derived prioritization evidence
- Score components
- Solution class mappings
- Metadata and limitations
- Data catalog records
- App-ready files or database loading scripts

## Implementation Record - 2026-05-17

Phase 2 has an initial reproducible implementation.

Primary outputs:

- `data/processed/phase3-app-data.json`
- `data/processed/layers/*.geojson`
- `data/processed/evidence/neighborhood-score-components.csv`
- `data/processed/evidence/neighborhood-score-components.json`
- `data/processed/evidence/planning-area-score-components.json`
- `data/processed/evidence/opportunity-summaries.json`
- `data/processed/evidence/solution-class-mapping.json`
- `data/processed/metadata/data-quality-report.json`
- `data/processed/metadata/provenance-manifest.json`

Scripts:

- `scripts/curate/prepare_interim_sources.py`
- `scripts/curate/build_phase2_outputs.mjs`
- `scripts/curate/apply_phase2_decisions.py`
- `scripts/validate/validate_phase2_outputs.mjs`

Current promoted scope:

- 17 promoted records
- 22 deferred records
- 3 rejected records
- 166 scored official neighborhoods
- 81 scored AP3 neighborhoods
- 9 available evidence layer definitions

Current methodological boundary:

- Neighborhood is the primary analytical unit.
- SNIS is promoted as municipal temporal context but is not timeline-ready.
- MapBiomas, INEA/IDE.RJ, ANA time series, SINISA structured route, OSM, and census-sector app drilldown remain deferred.
- SGB/CPRM susceptibility uses centroid allocation to neighborhoods for screening; it is not parcel-scale hazard mapping.
