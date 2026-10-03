# Phase 3 - Implementation

## Purpose

Phase 3 builds the user-facing web app and analytical interaction layer from curated evidence.

The app must be visually strong, technically useful, and methodologically transparent. It should make Rio de Janeiro explorable through geographic overlays while supporting rigorous AP3-focused research.

## Operating Rule

The map is the primary workspace; the card explains the selected territory.

The app should not become a generic dashboard or a data catalog with a map attached. The primary experience is geographic exploration.

## Phase Inputs

- [../../MASTERPLAN.md](../../MASTERPLAN.md)
- [../../CONTEXT.md](../../CONTEXT.md)
- [./phase-1-collection.md](./phase-1-collection.md)
- [./phase-2-data-curation.md](./phase-2-data-curation.md)
- `data/processed/`
- Curated metadata
- Prioritization evidence
- Score components
- Solution class mappings

## Phase Outputs

Required outputs:

- Web app source code
- Map workspace
- Planning Area filter with AP3 support
- Territorial drilldown
- Evidence overlay controls
- Active territorial unit selection
- Territorial opportunity card
- Technical lens and science communication lens
- Timeline control where temporal evidence exists
- Data catalog view
- Exportable or shareable summaries

Optional outputs:

- Static screenshots for communication
- Methodological appendix view
- Notebook-style validation artifacts
- Deployment configuration

## Core User Flow

1. User opens the map workspace.
2. User filters by Rio-wide view or a Planning Area such as AP3.
3. User turns evidence overlays on or off.
4. User changes territorial granularity through drilldown.
5. User selects the active territorial unit.
6. App opens the territorial opportunity card.
7. User toggles between technical lens and science communication lens.
8. User inspects suggested solution classes and evidence.
9. User optionally uses timeline controls when temporal evidence exists.
10. User reviews source transparency in the data catalog when needed.

## Main Views

### Map Workspace

Required:

- Full-screen or dominant map layout
- Evidence overlay panel
- Planning Area filter
- AP3 quick filter or saved focus
- Granularity control for AP, neighborhood, administrative region, and Census Sector where available
- Legend that changes with active overlays
- Selected territory highlight
- Loading and empty states

### Territorial Opportunity Card

Required:

- Territory name and unit type
- Prioritization score or status
- Main evidence signals
- Suggested solution classes
- Technical lens
- Science communication lens
- Source and uncertainty summary
- Link to relevant catalog entries

The card must adapt to the active territorial unit. It should not assume every selected geography has the same evidence resolution.

### Evidence Overlay Controls

Required:

- Overlay toggle for each promoted evidence layer
- Clear grouping by evidence family
- Visual legend per active layer
- Warning when layers have different temporal coverage or spatial resolution
- No display of unpromoted raw datasets as primary overlays

### Timeline

Required only when temporal evidence exists.

Rules:

- Do not show a timeline for non-comparable historical data.
- Clearly state the selected year or period.
- Allow layer-specific temporal availability.
- Avoid implying continuity where the source only provides discrete snapshots.

### Data Catalog

Required:

- Searchable or filterable list of source datasets
- Collection status
- Promotion status
- Evidence family
- Source institution
- License or restriction
- Spatial and temporal coverage
- Link to methodology or source notes

The data catalog supports transparency. It is not the primary app experience.

## Visual Quality Requirements

The app should feel like a serious geospatial research product, not a generic admin panel.

Requirements:

- Dense but readable interface
- Strong map-first composition
- Professional color system for multiple evidence families
- Legends that are understandable without long instructions
- No decorative visuals that compete with the data
- Clear distinction between selected, filtered, unavailable, and active states
- Responsive layout for desktop first, with mobile support if feasible

## Technical Requirements

The implementation should support:

- App-ready processed geospatial files or database-backed tiles
- Efficient map rendering for multiple overlays
- Stable metadata access for cards and catalog
- Reproducible local development
- Clear separation between raw data, curated data, and UI code
- Graceful behavior when a layer is missing or still pending

Framework, map library, and storage choices should be selected after data volume and performance needs are known.

## Analytical Requirements

The UI must preserve:

- Provenance
- Evidence family grouping
- Spatial resolution
- Temporal coverage
- Uncertainty and limitations
- Difference between source dataset and promoted prioritization evidence
- Difference between solution class and project design

## Interpretation Lens Requirements

### Technical Lens

Must include:

- Evidence details
- Source references
- Methodological limitations
- Spatial and temporal resolution notes
- Score component explanation

### Science Communication Lens

Must include:

- Clear explanation of what the selected territory suggests
- Plain-language risk and opportunity summary
- No hidden uncertainty
- No unsupported certainty
- No removal of important caveats

## Quality Gate

Phase 3 is successful when:

- The map can be used as the primary exploration surface.
- AP3 can be filtered directly.
- Evidence overlays can be toggled and understood.
- Active territorial units can be selected.
- The opportunity card explains selected territories.
- Technical and science communication lenses both work from the same evidence.
- Timeline appears only for defensible temporal evidence.
- The data catalog documents broader source work without overwhelming the map.
- The app can be run and verified locally.

## Non-Stop Execution Rule

When an implementation task is blocked:

1. Document the blocker.
2. Preserve partial implementation.
3. Use placeholder wiring only when it is clearly marked and does not fake analytical results.
4. Continue with the next implementable feature.

Do not stop because one layer is missing, one source is pending, one map interaction needs refinement, or one visual design decision is unresolved.

## Handoff Back To Earlier Phases

If implementation reveals missing data requirements, update:

- [./phase-1-collection.md](./phase-1-collection.md) when new source discovery is needed
- [./phase-2-data-curation.md](./phase-2-data-curation.md) when new derived evidence or transformation is needed
- [../../MASTERPLAN.md](../../MASTERPLAN.md) when scope or architecture changes
