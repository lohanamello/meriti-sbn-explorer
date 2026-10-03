# OpenStreetMap Source Notes

Primary source family:

- OpenStreetMap extracts for roads, waterways, green spaces, public amenities, and public-land proxies.

Phase 1 acquisition route:

- Use Overpass queries by theme instead of one broad city-wide dump when possible.
- Record the exact query text, extraction timestamp, and ODbL attribution requirements.
- Store raw OSM XML or GeoJSON without editing.
- Saved the Rio nature-based-solutions context query in `scripts/collect/overpass_queries/rio_nbs_context.overpassql`.
- Downloaded the raw Overpass JSON extract as `osm__rio_openstreetmap_extract__atual`.

Phase 2 notes:

- OSM can support opportunity-space context, but completeness varies by neighborhood and feature class.
- Any promoted use must document attribution and uncertainty.
- Split features by theme during curation before deciding whether OSM complements or conflicts with municipal sources.
