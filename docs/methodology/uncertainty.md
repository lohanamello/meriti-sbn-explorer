# Phase 2 Uncertainty And Limitations

## Non-Negotiable Caveat

The Phase 2 score is a screening model for research prioritization. It should help decide where to look first and how to explain territorial opportunity. It should not be presented as proof that a specific engineering intervention is feasible.

## Main Sources Of Uncertainty

### Hazard Interpretation

SGB/CPRM susceptibility polygons provide strong hazard context, but the current neighborhood allocation uses polygon centroids. This can misallocate polygons that cross neighborhood boundaries. The output is appropriate for citywide screening, not legal or engineering hazard certification.

### Drainage Interpretation

Data.Rio hydrography density and covered-watercourse share are pressure/context proxies. They do not measure drainage capacity, maintenance condition, obstruction, pipe dimensions, or flood recurrence.

### Social Vulnerability

The current Census 2022 use is population exposure. It is not yet a full vulnerability index. Income, age, race/color, household infrastructure, disability, and other vulnerability dimensions require additional verified variables and documentation.

### Green Infrastructure

The score uses public plaza area per resident as a documented green/public-space proxy. This is narrower than vegetation cover and does not capture tree canopy, imperviousness, private open space, or ecological condition. MapBiomas is deferred until raster processing is reproducible.

### Sanitation

SNIS is structured and temporal, but the curated rows are municipal/provider-level. They should be shown as context, not used to rank neighborhoods.

### Opportunity Space

Schools, health services, plazas, and civil-defense assets are opportunity or context signals. Their presence does not prove land availability, roof structure suitability, ownership permission, construction feasibility, or maintenance capacity.

## How Phase 3 Should Communicate This

The technical lens should show:

- score components;
- source dataset ids;
- spatial resolution;
- temporal coverage;
- missing components;
- centroid/direct-code/point-in-polygon assignment method;
- explicit limitations.

The science communication lens should say what the evidence suggests, while preserving uncertainty. It should avoid phrases such as "will solve", "safe", "confirmed risk", or "best project".

## Deferred Work Before Stronger Claims

- Raster zonal statistics for MapBiomas land cover and impervious/vegetation classes.
- Structured SINISA route and neighborhood-discriminating sanitation evidence, if available.
- ANA station selection and comparable hydrological time series.
- Full SGB polygon intersection instead of centroid allocation.
- Expanded Census 2022 vulnerability indicators with documented variable dictionary.

