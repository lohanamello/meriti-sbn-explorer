import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();

const REQUIRED_FILES = [
  "data/interim/ibge_census2022_basic_by_neighborhood.csv",
  "data/interim/ibge_census2022_city_summary.json",
  "data/interim/sgb_susceptibility_by_neighborhood.csv",
  "data/interim/sgb_susceptibility_quality.json",
  "data/processed/phase3-app-data.json",
  "data/processed/evidence/evidence-layers.json",
  "data/processed/evidence/neighborhood-score-components.csv",
  "data/processed/evidence/neighborhood-score-components.json",
  "data/processed/evidence/planning-area-score-components.json",
  "data/processed/evidence/opportunity-summaries.json",
  "data/processed/evidence/solution-class-mapping.json",
  "data/processed/evidence/sanitation-timeseries-snis-rio-ae.json",
  "data/processed/metadata/data-quality-report.json",
  "data/processed/metadata/provenance-manifest.json"
];

const REQUIRED_LAYER_KEYS = [
  "planningAreas",
  "administrativeRegions",
  "neighborhoods",
  "neighborhoodScores",
  "hydrography",
  "subBasins",
  "plazas",
  "protectedAreas",
  "publicFacilities",
  "civilDefense",
  "monitoringStations"
];

await main();

async function main() {
  for (const file of REQUIRED_FILES) {
    assert(existsSync(abs(file)), `Missing required file: ${file}`);
  }

  const bundle = await readJson("data/processed/phase3-app-data.json");
  assert(
    bundle.schemaVersion === "phase2.app-data.v1",
    "Unexpected phase3 bundle schema"
  );
  assert(bundle.sourceMode === "processed", "Bundle must be processed mode");
  assert(bundle.outputCrs === "EPSG:4326", "Bundle output CRS must be EPSG:4326");

  const units = bundle.territorialUnits ?? [];
  assert(units.length >= 200, `Expected at least 200 territorial units, got ${units.length}`);
  assert(
    units.some((unit) => unit.id === "ap3"),
    "AP3 territorial unit is required"
  );
  assert(
    units.filter((unit) => unit.unitType === "neighborhood" && unit.planningArea === "AP3").length >= 70,
    "AP3 neighborhood drilldown coverage is unexpectedly low"
  );

  const layers = bundle.evidenceLayers ?? [];
  assert(layers.length >= 8, "Expected at least 8 curated evidence layers");
  assert(
    layers.every((layer) => layer.status === "available"),
    "All Phase 2 evidence layers should be available or omitted"
  );
  assert(
    layers.every((layer) => Array.isArray(layer.sourceDatasetIds) && layer.sourceDatasetIds.length > 0),
    "Every evidence layer needs sourceDatasetIds"
  );

  for (const key of REQUIRED_LAYER_KEYS) {
    const layerPath = bundle.layerFiles?.[key];
    assert(layerPath, `Missing layerFiles.${key}`);
    const geojson = await readJson(layerPath);
    assert(geojson.type === "FeatureCollection", `${layerPath} must be FeatureCollection`);
    assert(Array.isArray(geojson.features), `${layerPath} has no features array`);
    assert(geojson.features.length > 0, `${layerPath} has no features`);
  }

  const scoreRows = bundle.scoreComponents?.neighborhoods ?? [];
  assert(scoreRows.length >= 160, "Expected neighborhood score rows");
  assert(
    scoreRows.every(
      (row) =>
        row.score === null ||
        (typeof row.score === "number" && row.score >= 0 && row.score <= 100)
    ),
    "Neighborhood scores must be null or in 0-100"
  );
  assert(
    scoreRows.some((row) => row.planning_area === "AP3" && row.score !== null),
    "At least one AP3 neighborhood must be scored"
  );

  const summaries = bundle.opportunitySummaries ?? {};
  assert(summaries.ap3, "AP3 opportunity summary is required");
  assert(
    Object.values(summaries).every((summary) => summary.prioritizationStatus !== "mock"),
    "Opportunity summaries must not use mock status"
  );

  const serialized = JSON.stringify(bundle);
  assert(!serialized.includes('"sourceMode":"mock"'), "Bundle contains mock sourceMode");
  assert(!serialized.includes("Dados demonstrativos"), "Bundle contains demo copy");

  const quality = await readJson("data/processed/metadata/data-quality-report.json");
  assert(
    quality.scoreCoverage?.scoredNeighborhoods >= 150,
    "Score coverage below expected threshold"
  );

  const catalog = await readText("data/catalog/dataset-inventory.csv");
  assert(catalog.includes(",promoted,"), "Inventory has no promoted records");
  assert(catalog.includes("Phase 2:"), "Inventory was not annotated with Phase 2 decisions");

  console.log(
    `Phase 2 outputs valid: ${scoreRows.length} neighborhood score rows, ${layers.length} evidence layers.`
  );
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

async function readText(file) {
  return readFile(abs(file), "utf8");
}

function abs(file) {
  return path.join(projectRoot, file);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
