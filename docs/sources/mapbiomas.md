# MapBiomas Source Notes

Primary source family:

- MapBiomas 10 m coverage and land-use products.

Phase 1 acquisition route:

- Record the collection/version, selected years, spatial clipping strategy, and exact export route.
- Use manual/export status until the download URL or Earth Engine export recipe is explicit.
- Store exported raster files as raw source files without reclassification.
- Downloaded the public collection page and national 10 m GeoTIFFs for 2019, 2020, 2021, 2022, and 2023 from the MapBiomas public Google Cloud Storage route.

Phase 2 notes:

- Candidate uses include vegetation deficit, land-cover change, urban expansion, and impervious/urban pressure proxies.
- Temporal evidence is only valid when class definitions and collection versions are comparable across selected years.
- The downloaded GeoTIFFs are national-scale raw rasters. Rio/AP3 clipping, class interpretation, CRS inspection, and any area statistics belong to Phase 2.
