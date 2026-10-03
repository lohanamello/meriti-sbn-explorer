# Phase 2 Scoring Model

## Score Name

`urban_water_opportunity_screening_score`

This is an explainable screening score for research prioritization. It is not a hydraulic model, official risk certificate, sanitation diagnosis, or final intervention design.

## Spatial Unit

The primary score unit is the official Data.Rio neighborhood. Planning Area summaries are population-weighted aggregations of neighborhood scores when Census 2022 population is available; otherwise area weighting is used.

## Components

All components are normalized as citywide percentile ranks across official Rio neighborhoods, from 0 to 100.

| Component | Weight | Main inputs | Interpretation |
| --- | ---: | --- | --- |
| `flood_exposure` | 0.30 | SGB/CPRM inundation weighted area, high-class inundation share, hydrography density | Higher values indicate stronger flood/susceptibility screening signal. |
| `drainage_pressure` | 0.20 | Hydrography density, covered hydrography density, covered share | Higher values indicate stronger watercourse/drainage pressure context. |
| `social_exposure` | 0.20 | IBGE Census 2022 population density | Higher values indicate more residents exposed per area. |
| `green_space_deficit` | 0.20 | Inverse percentile of plaza area per 1,000 residents | Higher values indicate lower public plaza provision relative to population. |
| `civil_defense_context` | 0.05 | Civil-defense assets per km2 and sirens per km2 | Higher values indicate recognized risk-response context, not measured hazard. |
| `opportunity_space` | 0.05 | Public facility density and plaza count density | Higher values indicate more public or public-serving anchors for SBN classes. |

If a component is missing for a territory, the score excludes that component and renormalizes the remaining weights. This is recorded in the score component row and should be visible in the technical lens.

IBGE variable interpretation was checked against the official 2022 sector aggregate documentation:

- `V0001`: total persons.
- `V0007`: total occupied private households.

Reference: https://biblioteca.ibge.gov.br/index.php/biblioteca-catalogo?id=2102136&view=detalhes

## Banding

| Score | Band |
| ---: | --- |
| 80-100 | `very_high` |
| 65-79.999 | `high` |
| 50-64.999 | `elevated` |
| 35-49.999 | `moderate` |
| 0-34.999 | `lower` |

## AP3 Current Result

The generated AP3 summary is `elevated`, with 81 scored official neighborhoods. Top AP3 neighborhoods in the current output include Olaria, Cachambi, Osvaldo Cruz, Bras de Pina, Parada de Lucas, Manguinhos, Colegio, Abolicao, Portuguesa, and Anchieta.

These names are ranking outputs from the screening model, not final project recommendations.

## Why SNIS Is Not In The Neighborhood Score

SNIS Rio AE data is promoted as sanitation context because it is structured and temporal. It is excluded from the neighborhood score because the captured rows are municipal/provider records and do not discriminate conditions by neighborhood. Provider territories also change over time, so the current export is not timeline-ready for the app.

## Why MapBiomas Is Deferred

MapBiomas would be stronger evidence for vegetation and impervious surface, but the collected 10 m GeoTIFFs require reproducible raster clipping, class accounting, and temporal comparability checks. Until that pipeline exists, public plaza area is used as a narrower and clearly documented green/public-space proxy.
