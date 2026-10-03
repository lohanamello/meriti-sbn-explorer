# SNIS / SINISA Source Notes

Primary source families:

- SNIS Serie Historica for historical sanitation indicators.
- SINISA for the continuing national sanitation information system from 2024 onward.

Phase 1 acquisition route:

- Confirm the current export route for SNIS Serie Historica before downloading.
- Confirm whether SINISA exposes downloadable data, APIs, or only portal views for the desired indicators.
- Record schema differences between SNIS and SINISA as a blocker or limitation if continuity is not straightforward.
- SNIS Serie Historica currently resolves through `https://app4.cidades.gov.br/serieHistorica/` for the public app route used here.
- Downloaded a Rio de Janeiro Agua e Esgotos aggregate JSON export for 1995-2022 through the public app AJAX flow.
- Captured the SINISA public page snapshot. A structured SINISA data export/API route remains unresolved.

Phase 2 notes:

- These data may be too coarse for AP3 intra-urban prioritization but still useful as municipal context.
- Use with caution for drainage and sanitation stress unless more granular municipal data are found.
- Normalize provider/year/indicator records before any comparison with territorial evidence.
