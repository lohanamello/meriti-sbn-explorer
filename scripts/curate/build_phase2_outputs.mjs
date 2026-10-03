import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import proj4 from "proj4";

const projectRoot = process.cwd();
const rawDir = path.join(projectRoot, "data", "raw");
const processedDir = path.join(projectRoot, "data", "processed");
const layersDir = path.join(processedDir, "layers");
const evidenceDir = path.join(processedDir, "evidence");
const metadataDir = path.join(processedDir, "metadata");

proj4.defs(
  "EPSG:31983",
  "+proj=utm +zone=23 +south +ellps=GRS80 +units=m +no_defs +type=crs"
);

const SOURCE_PATHS = {
  planningAreas:
    "data/raw/data-rio/data-rio__limites_ap__atual/limites_ap.json",
  administrativeRegions:
    "data/raw/data-rio/data-rio__limites_ra__atual/limites_ra.json",
  neighborhoods:
    "data/raw/data-rio/data-rio__limites_bairros__atual/limites_bairros.json",
  hydrology:
    "data/raw/data-rio/data-rio__hidrografia__atual/hidrografia_arcgis_capture.json",
  subBasins:
    "data/raw/data-rio/data-rio__sub_bacias_hidrograficas__atual/sub_bacias_hidrograficas_arcgis_capture.json",
  plazas:
    "data/raw/data-rio/data-rio__pracas__atual/pracas_arcgis_capture.json",
  protectedAreas:
    "data/raw/data-rio/data-rio__areas_protegidas__atual/areas_protegidas_arcgis_capture.json",
  schools:
    "data/raw/data-rio/data-rio__escolas_municipais__atual/escolas_municipais_arcgis_capture.json",
  health:
    "data/raw/data-rio/data-rio__servicos_saude__atual/servicos_saude_arcgis_capture.json",
  sirens:
    "data/raw/data-rio/data-rio__defesa_civil_sirenes__atual/defesa_civil_sirenes_arcgis_capture.json",
  supportPoints:
    "data/raw/data-rio/data-rio__defesa_civil_pontos_apoio__atual/defesa_civil_pontos_apoio_arcgis_capture.json",
  nupdec:
    "data/raw/data-rio/data-rio__defesa_civil_nupdec__atual/defesa_civil_nupdec_arcgis_capture.json",
  shelters:
    "data/raw/data-rio/data-rio__defesa_civil_alojamentos__atual/defesa_civil_alojamentos_arcgis_capture.json",
  alertaRioStations:
    "data/raw/data-rio/data-rio__alerta_rio_estacoes__atual/alerta_rio_estacoes.json",
  snisGridConfig:
    "data/raw/snis/snis__serie_historica_rio_agregado_ae__1995_2022/snis_rio_ae_grid_config.json",
  snisGridData:
    "data/raw/snis/snis__serie_historica_rio_agregado_ae__1995_2022/snis_rio_ae_grid_data.json",
  ibgeNeighborhoodTable:
    "data/interim/ibge_census2022_basic_by_neighborhood.csv",
  sgbNeighborhoodTable:
    "data/interim/sgb_susceptibility_by_neighborhood.csv"
};

const DATASET_IDS = {
  planningAreas: "data-rio__limites_ap__atual",
  administrativeRegions: "data-rio__limites_ra__atual",
  neighborhoods: "data-rio__limites_bairros__atual",
  hydrology: "data-rio__hidrografia__atual",
  subBasins: "data-rio__sub_bacias_hidrograficas__atual",
  plazas: "data-rio__pracas__atual",
  protectedAreas: "data-rio__areas_protegidas__atual",
  schools: "data-rio__escolas_municipais__atual",
  health: "data-rio__servicos_saude__atual",
  sirens: "data-rio__defesa_civil_sirenes__atual",
  supportPoints: "data-rio__defesa_civil_pontos_apoio__atual",
  nupdec: "data-rio__defesa_civil_nupdec__atual",
  shelters: "data-rio__defesa_civil_alojamentos__atual",
  alertaRioStations: "data-rio__alerta_rio_estacoes__atual",
  ibge: "ibge__setores_censitarios_agregados_rj__2022",
  sgb: "sgb-cprm__rio_suscetibilidade_sig_zip__2018",
  snis: "snis__serie_historica_rio_agregado_ae__1995_2022"
};

const AP_NAMES = new Map([
  ["AP1", "AP1"],
  ["AP2", "AP2"],
  ["AP3", "AP3 - Escopo de estudo"],
  ["AP4", "AP4"],
  ["AP5", "AP5"]
]);

const SCORE_WEIGHTS = {
  flood_exposure: 0.3,
  drainage_pressure: 0.2,
  social_exposure: 0.2,
  green_space_deficit: 0.2,
  civil_defense_context: 0.05,
  opportunity_space: 0.05
};

const SCORE_CATEGORY_LABELS = {
  very_high: "muito alto",
  high: "alto",
  elevated: "elevado",
  moderate: "moderado",
  lower: "mais baixo",
  pending: "pendente"
};

const SCORE_BAND_LABELS = {
  very_high: "muito alta",
  high: "alta",
  elevated: "elevada",
  moderate: "moderada",
  lower: "mais baixa",
  pending: "pendente"
};

await main();

async function main() {
  await Promise.all([
    mkdir(layersDir, { recursive: true }),
    mkdir(evidenceDir, { recursive: true }),
    mkdir(metadataDir, { recursive: true })
  ]);

  const raw = await readRawSources();
  const territorial = buildTerritorialUnits(raw);
  const metrics = await buildNeighborhoodMetrics(raw, territorial);
  applyScores(metrics.neighborhoods);
  const planningAreaScores = buildPlanningAreaScores(metrics.neighborhoods);

  const layers = buildEvidenceLayers();
  const solutionMapping = buildSolutionMapping();
  const opportunitySummaries = buildOpportunitySummaries(
    metrics.neighborhoods,
    planningAreaScores,
    solutionMapping
  );
  const sanitationTemporal = buildSnisTemporalContext(raw.snisGridConfig, raw.snisGridData);

  const layerFiles = await writeLayerFiles(raw, territorial, metrics.neighborhoods);
  const dataQualityReport = buildDataQualityReport(
    raw,
    metrics,
    territorial,
    sanitationTemporal
  );
  const provenanceManifest = await buildProvenanceManifest();

  const phase3Bundle = {
    schemaVersion: "phase2.app-data.v1",
    generatedAt: new Date().toISOString(),
    outputCrs: "EPSG:4326",
    sourceMode: "processed",
    primaryTerritorialUnit: "neighborhood",
    ap3StudyScope: "AP3",
    layerFiles,
    territorialUnits: [
      ...territorial.planningAreaUnits,
      ...territorial.administrativeRegionUnits,
      ...territorial.neighborhoodUnits
    ],
    evidenceLayers: layers,
    opportunitySummaries,
    scoreComponents: {
      methodology: {
        scoreName: "pontuacao_triagem_oportunidade_hidrica_urbana",
        scale: "0-100",
        weights: SCORE_WEIGHTS,
        normalization: "Ranks percentis em escala municipal sobre os bairros oficiais do Rio; componentes ausentes são excluídos e os pesos restantes são renormalizados.",
        limitation: "Pontuação de triagem para priorização de pesquisa; não substitui projeto de engenharia, certificação oficial de risco ou diagnóstico em escala de lote."
      },
      neighborhoods: metrics.neighborhoods.map(toScoreComponentRecord),
      planningAreas: planningAreaScores.map(toPlanningAreaScoreRecord)
    },
    temporalEvidence: sanitationTemporal.summary,
    methodologyFiles: [
      "docs/methodology/evidence-model.md",
      "docs/methodology/scoring-model.md",
      "docs/methodology/territorial-units.md",
      "docs/methodology/uncertainty.md"
    ]
  };

  await writeJson(path.join(processedDir, "phase3-app-data.json"), phase3Bundle);
  await writeJson(path.join(evidenceDir, "evidence-layers.json"), layers);
  await writeJson(path.join(evidenceDir, "opportunity-summaries.json"), opportunitySummaries);
  await writeJson(path.join(evidenceDir, "solution-class-mapping.json"), solutionMapping);
  await writeJson(
    path.join(evidenceDir, "neighborhood-score-components.json"),
    metrics.neighborhoods.map(toScoreComponentRecord)
  );
  await writeCsv(
    path.join(evidenceDir, "neighborhood-score-components.csv"),
    metrics.neighborhoods.map(toScoreComponentRecord)
  );
  await writeJson(
    path.join(evidenceDir, "planning-area-score-components.json"),
    planningAreaScores.map(toPlanningAreaScoreRecord)
  );
  await writeJson(
    path.join(evidenceDir, "sanitation-timeseries-snis-rio-ae.json"),
    sanitationTemporal
  );
  await writeJson(path.join(metadataDir, "data-quality-report.json"), dataQualityReport);
  await writeJson(path.join(metadataDir, "provenance-manifest.json"), provenanceManifest);

  console.log(
    `Pacote processado da fase 2 escrito com ${metrics.neighborhoods.length} bairros e ${layers.length} camadas de evidência.`
  );
}

async function readRawSources() {
  const [
    planningAreas,
    administrativeRegions,
    neighborhoods,
    hydrology,
    subBasins,
    plazas,
    protectedAreas,
    schools,
    health,
    sirens,
    supportPoints,
    nupdec,
    shelters,
    alertaRioStations,
    ibgeNeighborhoodRows,
    sgbNeighborhoodRows,
    snisGridConfig,
    snisGridData
  ] = await Promise.all([
    readArcgisSource(SOURCE_PATHS.planningAreas),
    readArcgisSource(SOURCE_PATHS.administrativeRegions),
    readArcgisSource(SOURCE_PATHS.neighborhoods),
    readArcgisSource(SOURCE_PATHS.hydrology),
    readArcgisSource(SOURCE_PATHS.subBasins),
    readArcgisSource(SOURCE_PATHS.plazas),
    readArcgisSource(SOURCE_PATHS.protectedAreas),
    readArcgisSource(SOURCE_PATHS.schools),
    readArcgisSource(SOURCE_PATHS.health),
    readArcgisSource(SOURCE_PATHS.sirens),
    readArcgisSource(SOURCE_PATHS.supportPoints),
    readArcgisSource(SOURCE_PATHS.nupdec),
    readArcgisSource(SOURCE_PATHS.shelters),
    readArcgisSource(SOURCE_PATHS.alertaRioStations),
    readCsv(SOURCE_PATHS.ibgeNeighborhoodTable),
    readCsv(SOURCE_PATHS.sgbNeighborhoodTable),
    readJson(SOURCE_PATHS.snisGridConfig),
    readJson(SOURCE_PATHS.snisGridData)
  ]);

  return {
    planningAreas,
    administrativeRegions,
    neighborhoods,
    hydrology,
    subBasins,
    plazas,
    protectedAreas,
    schools,
    health,
    sirens,
    supportPoints,
    nupdec,
    shelters,
    alertaRioStations,
    ibgeNeighborhoodRows,
    sgbNeighborhoodRows,
    snisGridConfig,
    snisGridData
  };
}

function buildTerritorialUnits(raw) {
  const planningAreaUnits = raw.planningAreas.features.map((feature) => {
    const ap = `AP${feature.attributes.codapnum}`;
    return {
      id: ap.toLowerCase(),
      name: AP_NAMES.get(ap) ?? ap,
      unitType: "planning_area",
      planningArea: ap,
      sourceMode: "processed",
      sourceDatasetId: DATASET_IDS.planningAreas,
      areaKm2: round(toNumber(feature.attributes.Shape__Area) / 1_000_000),
      geometry: esriFeatureToGeoJsonFeature(feature, raw.planningAreas, {
        id: ap.toLowerCase(),
        name: AP_NAMES.get(ap) ?? ap,
        unitType: "planning_area",
        planningArea: ap,
        sourceDatasetId: DATASET_IDS.planningAreas
      })
    };
  });

  const administrativeRegionUnits = raw.administrativeRegions.features.map((feature) => {
    const code = String(feature.attributes.codra).trim();
    const ap = `AP${feature.attributes.codapnum}`;
    const name = cleanText(feature.attributes.nomera);
    return {
      id: `ra-${code}`,
      name,
      unitType: "administrative_region",
      planningArea: ap,
      sourceMode: "processed",
      sourceDatasetId: DATASET_IDS.administrativeRegions,
      code,
      areaKm2: round(toNumber(feature.attributes.Shape__Area) / 1_000_000),
      geometry: esriFeatureToGeoJsonFeature(feature, raw.administrativeRegions, {
        id: `ra-${code}`,
        name,
        code,
        unitType: "administrative_region",
        planningArea: ap,
        sourceDatasetId: DATASET_IDS.administrativeRegions
      })
    };
  });

  const neighborhoodUnits = raw.neighborhoods.features.map((feature) => {
    const code = String(feature.attributes.codbnum).trim();
    const ap = `AP${feature.attributes.area_plane}`;
    const name = cleanText(feature.attributes.nome);
    return {
      id: `bairro-${code}`,
      name,
      unitType: "neighborhood",
      planningArea: ap,
      sourceMode: "processed",
      sourceDatasetId: DATASET_IDS.neighborhoods,
      code,
      key: normalizeName(name),
      administrativeRegionCode: String(feature.attributes.codra ?? "").trim(),
      administrativeRegionName: cleanText(feature.attributes.regiao_adm),
      planningRegion: cleanText(feature.attributes.rp),
      areaKm2: round(toNumber(feature.attributes.Shape__Area) / 1_000_000),
      rawFeature: feature,
      geometry: esriFeatureToGeoJsonFeature(feature, raw.neighborhoods, {
        id: `bairro-${code}`,
        name,
        code,
        unitType: "neighborhood",
        planningArea: ap,
        sourceDatasetId: DATASET_IDS.neighborhoods
      })
    };
  });

  const neighborhoodsByCode = new Map(
    neighborhoodUnits.map((unit) => [unit.code, unit])
  );
  const neighborhoodsByKey = new Map(
    neighborhoodUnits.map((unit) => [unit.key, unit])
  );

  return {
    planningAreaUnits,
    administrativeRegionUnits,
    neighborhoodUnits,
    neighborhoodsByCode,
    neighborhoodsByKey
  };
}

async function buildNeighborhoodMetrics(raw, territorial) {
  const metrics = new Map();

  for (const unit of territorial.neighborhoodUnits) {
    metrics.set(unit.code, {
      id: unit.id,
      neighborhood_code: unit.code,
      neighborhood_key: unit.key,
      neighborhood_name: unit.name,
      planning_area: unit.planningArea,
      administrative_region_code: unit.administrativeRegionCode,
      administrative_region_name: unit.administrativeRegionName,
      official_area_km2: unit.areaKm2,
      population_total: null,
      population_density_per_km2: null,
      ibge_sector_count: 0,
      hydrology_length_m: 0,
      covered_hydrology_length_m: 0,
      hydrology_feature_count: 0,
      plaza_count: 0,
      plaza_area_m2: 0,
      protected_area_count: 0,
      protected_area_m2_centroid_allocated: 0,
      school_count: 0,
      health_service_count: 0,
      civil_defense_siren_count: 0,
      civil_defense_support_point_count: 0,
      civil_defense_nupdec_count: 0,
      civil_defense_shelter_count: 0,
      alerta_rio_station_count: 0,
      sgb_inundacao_total_area_km2: 0,
      sgb_inundacao_high_area_share: 0,
      sgb_inundacao_weighted_area_index: 0,
      sgb_enxurrada_area_share: 0,
      sgb_movimento_massa_weighted_area_index: 0,
      assignment_notes: []
    });
  }

  applyIbgeMetrics(metrics, raw.ibgeNeighborhoodRows);
  applySgbMetrics(metrics, raw.sgbNeighborhoodRows);
  applyHydrologyMetrics(metrics, raw.hydrology);
  applyPlazaMetrics(metrics, raw.plazas);
  applyProtectedAreaMetrics(metrics, raw.protectedAreas, territorial);
  applyPointMetrics(metrics, raw.schools, territorial, "school_count");
  applyPointMetrics(metrics, raw.health, territorial, "health_service_count");
  applyPointMetrics(metrics, raw.sirens, territorial, "civil_defense_siren_count");
  applyPointMetrics(
    metrics,
    raw.supportPoints,
    territorial,
    "civil_defense_support_point_count"
  );
  applyPointMetrics(metrics, raw.nupdec, territorial, "civil_defense_nupdec_count");
  applyPointMetrics(metrics, raw.shelters, territorial, "civil_defense_shelter_count");
  applyPointMetrics(
    metrics,
    raw.alertaRioStations,
    territorial,
    "alerta_rio_station_count"
  );

  const neighborhoods = [...metrics.values()].map((record) => {
    const area = record.official_area_km2;
    const population = record.population_total;
    const civilDefenseAssets =
      record.civil_defense_siren_count +
      record.civil_defense_support_point_count +
      record.civil_defense_nupdec_count +
      record.civil_defense_shelter_count;
    const publicFacilities = record.school_count + record.health_service_count;

    return {
      ...record,
      hydrology_density_m_per_km2: round(divide(record.hydrology_length_m, area)),
      covered_hydrology_density_m_per_km2: round(
        divide(record.covered_hydrology_length_m, area)
      ),
      covered_hydrology_share: round(
        divide(record.covered_hydrology_length_m, record.hydrology_length_m)
      ),
      plaza_area_m2_per_1000_residents:
        population && population > 0
          ? round((record.plaza_area_m2 / population) * 1000)
          : null,
      plaza_count_density_per_km2: round(divide(record.plaza_count, area)),
      protected_area_share_centroid_allocated: round(
        divide(record.protected_area_m2_centroid_allocated / 1_000_000, area)
      ),
      civil_defense_assets: civilDefenseAssets,
      civil_defense_assets_per_km2: round(divide(civilDefenseAssets, area)),
      civil_defense_sirens_per_km2: round(
        divide(record.civil_defense_siren_count, area)
      ),
      public_facility_count: publicFacilities,
      public_facility_density_per_km2: round(divide(publicFacilities, area)),
      has_census_metrics: record.ibge_sector_count > 0,
      score: null,
      score_category: "pending",
      components: {}
    };
  });

  return { neighborhoods };
}

function applyIbgeMetrics(metrics, rows) {
  for (const row of rows) {
    const code = String(row.neighborhood_code ?? "").trim();
    const target = metrics.get(code);
    if (!target) continue;

    const population = nullableNumber(row.v0001_population_total);
    target.population_total = population;
    target.population_density_per_km2 = nullableNumber(
      row.population_density_per_km2
    );
    target.ibge_sector_count = toNumber(row.sector_count);
    target.ibge_occupied_private_households = nullableNumber(
      row.v0007_occupied_private_households
    );
    target.ibge_occupied_household_density_per_km2 = nullableNumber(
      row.occupied_household_density_per_km2
    );
    target.ibge_source_neighborhood_names = row.source_neighborhood_names;
    if (target.ibge_sector_count === 0) {
      target.assignment_notes.push("Sem correspondência NM_BAIRRO no Censo 2022.");
    }
  }
}

function applySgbMetrics(metrics, rows) {
  for (const row of rows) {
    const code = String(row.neighborhood_code ?? "").trim();
    const target = metrics.get(code);
    if (!target) continue;

    target.sgb_feature_count = toNumber(row.feature_count);
    target.sgb_inundacao_feature_count = toNumber(row.inundacao_feature_count);
    target.sgb_inundacao_total_area_km2 = toNumber(row.inundacao_total_area_km2);
    target.sgb_inundacao_high_area_share = toNumber(
      row.inundacao_high_area_share_of_neighborhood
    );
    target.sgb_inundacao_weighted_area_index = toNumber(
      row.inundacao_weighted_area_index
    );
    target.sgb_enxurrada_area_share = toNumber(
      row.enxurrada_area_share_of_neighborhood
    );
    target.sgb_movimento_massa_weighted_area_index = toNumber(
      row.movimento_massa_weighted_area_index
    );
    target.sgb_corrida_massa_area_share = toNumber(
      row.corrida_massa_area_share_of_neighborhood
    );
  }
}

function applyHydrologyMetrics(metrics, hydrology) {
  for (const feature of hydrology.features) {
    const code = normalizeCode(feature.attributes.cod_bairro);
    const target = metrics.get(code);
    if (!target) continue;

    const length = toNumber(
      feature.attributes.Shape__Length ?? feature.attributes.compriment
    );
    target.hydrology_length_m += length;
    target.hydrology_feature_count += 1;
    if (String(feature.attributes.coberto ?? "").trim().toUpperCase() === "S") {
      target.covered_hydrology_length_m += length;
    }
  }
}

function applyPlazaMetrics(metrics, plazas) {
  for (const feature of plazas.features) {
    const code = normalizeCode(feature.attributes.bairro);
    const target = metrics.get(code);
    if (!target) continue;

    target.plaza_count += 1;
    target.plaza_area_m2 += toNumber(feature.attributes.Shape__Area);
  }
}

function applyProtectedAreaMetrics(metrics, protectedAreas, territorial) {
  for (const feature of protectedAreas.features) {
    const centroid = centroidFromRings(feature.geometry?.rings);
    if (!centroid) continue;
    const unit = findContainingNeighborhood(centroid, territorial.neighborhoodUnits);
    if (!unit) continue;

    const target = metrics.get(unit.code);
    if (!target) continue;
    target.protected_area_count += 1;
    target.protected_area_m2_centroid_allocated += toNumber(
      feature.attributes["st_area(shape)"] ?? feature.attributes.area_ha * 10_000
    );
  }
}

function applyPointMetrics(metrics, source, territorial, metricName) {
  for (const feature of source.features) {
    const point = feature.geometry ? [feature.geometry.x, feature.geometry.y] : null;
    if (!point) continue;
    const unit = findContainingNeighborhood(point, territorial.neighborhoodUnits);
    if (!unit) continue;

    const target = metrics.get(unit.code);
    if (target) target[metricName] += 1;
  }
}

function applyScores(neighborhoods) {
  const values = {
    inundation: percentileLookup(neighborhoods, "sgb_inundacao_weighted_area_index"),
    inundationHigh: percentileLookup(neighborhoods, "sgb_inundacao_high_area_share"),
    hydrologyDensity: percentileLookup(neighborhoods, "hydrology_density_m_per_km2"),
    coveredHydrologyDensity: percentileLookup(
      neighborhoods,
      "covered_hydrology_density_m_per_km2"
    ),
    coveredHydrologyShare: percentileLookup(neighborhoods, "covered_hydrology_share"),
    populationDensity: percentileLookup(neighborhoods, "population_density_per_km2"),
    plazaAreaPerCapita: percentileLookup(
      neighborhoods,
      "plaza_area_m2_per_1000_residents"
    ),
    civilDefenseDensity: percentileLookup(
      neighborhoods,
      "civil_defense_assets_per_km2"
    ),
    sirenDensity: percentileLookup(neighborhoods, "civil_defense_sirens_per_km2"),
    publicFacilityDensity: percentileLookup(
      neighborhoods,
      "public_facility_density_per_km2"
    ),
    plazaCountDensity: percentileLookup(neighborhoods, "plaza_count_density_per_km2")
  };

  for (const record of neighborhoods) {
    const floodExposure = weightedAverage([
      [values.inundation.get(record), 0.65],
      [values.inundationHigh.get(record), 0.2],
      [values.hydrologyDensity.get(record), 0.15]
    ]);
    const drainagePressure = weightedAverage([
      [values.hydrologyDensity.get(record), 0.5],
      [values.coveredHydrologyDensity.get(record), 0.3],
      [values.coveredHydrologyShare.get(record), 0.2]
    ]);
    const socialExposure = values.populationDensity.get(record);
    const plazaPercentile = values.plazaAreaPerCapita.get(record);
    const greenSpaceDeficit =
      plazaPercentile === null ? null : round(100 - plazaPercentile);
    const civilDefenseContext = weightedAverage([
      [values.civilDefenseDensity.get(record), 0.65],
      [values.sirenDensity.get(record), 0.35]
    ]);
    const opportunitySpace = weightedAverage([
      [values.publicFacilityDensity.get(record), 0.7],
      [values.plazaCountDensity.get(record), 0.3]
    ]);

    record.components = {
      flood_exposure: round(floodExposure),
      drainage_pressure: round(drainagePressure),
      social_exposure: round(socialExposure),
      green_space_deficit: round(greenSpaceDeficit),
      civil_defense_context: round(civilDefenseContext),
      opportunity_space: round(opportunitySpace)
    };
    record.score = round(
      weightedAverage(
        Object.entries(SCORE_WEIGHTS).map(([component, weight]) => [
          record.components[component],
          weight
        ])
      )
    );
    record.score_category = scoreCategory(record.score);
  }

  neighborhoods.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.neighborhood_name.localeCompare(b.neighborhood_name);
  });
  neighborhoods.forEach((record, index) => {
    record.score_rank_citywide = index + 1;
  });
}

function buildPlanningAreaScores(neighborhoods) {
  const groups = new Map();
  for (const record of neighborhoods) {
    const group = groups.get(record.planning_area) ?? {
      planning_area: record.planning_area,
      neighborhood_count: 0,
      official_area_km2: 0,
      population_total: 0,
      hydrology_length_m: 0,
      plaza_area_m2: 0,
      civil_defense_assets: 0,
      public_facility_count: 0,
      componentSums: {},
      componentWeights: {},
      scoreSum: 0,
      scoreWeight: 0
    };

    const weight = record.population_total || record.official_area_km2 || 1;
    group.neighborhood_count += 1;
    group.official_area_km2 += record.official_area_km2;
    group.population_total += record.population_total ?? 0;
    group.hydrology_length_m += record.hydrology_length_m;
    group.plaza_area_m2 += record.plaza_area_m2;
    group.civil_defense_assets += record.civil_defense_assets;
    group.public_facility_count += record.public_facility_count;
    if (record.score !== null) {
      group.scoreSum += record.score * weight;
      group.scoreWeight += weight;
    }
    for (const [component, value] of Object.entries(record.components)) {
      if (value === null || !Number.isFinite(value)) continue;
      group.componentSums[component] =
        (group.componentSums[component] ?? 0) + value * weight;
      group.componentWeights[component] =
        (group.componentWeights[component] ?? 0) + weight;
    }
    groups.set(record.planning_area, group);
  }

  return [...groups.values()]
    .map((group) => {
      const components = {};
      for (const component of Object.keys(SCORE_WEIGHTS)) {
        components[component] = round(
          divide(group.componentSums[component], group.componentWeights[component])
        );
      }
      const score = round(divide(group.scoreSum, group.scoreWeight));
      return {
        id: group.planning_area.toLowerCase(),
        name: AP_NAMES.get(group.planning_area) ?? group.planning_area,
        planning_area: group.planning_area,
        neighborhood_count: group.neighborhood_count,
        official_area_km2: round(group.official_area_km2),
        population_total: Math.round(group.population_total),
        hydrology_length_m: round(group.hydrology_length_m),
        plaza_area_m2: round(group.plaza_area_m2),
        civil_defense_assets: group.civil_defense_assets,
        public_facility_count: group.public_facility_count,
        components,
        score,
        score_category: scoreCategory(score)
      };
    })
    .sort((a, b) => a.planning_area.localeCompare(b.planning_area));
}

function buildEvidenceLayers() {
  return [
    {
      id: "urban-water-prioritization-score",
      family: "Alagamentos, inundação e risco hídrico urbano",
      label: "Pontuação de priorização hídrica urbana",
      status: "available",
      resolution: "Bairros oficiais do Rio; sínteses por AP são agregações ponderadas por população.",
      temporalCoverage: "Camadas municipais atuais, Censo 2022 e suscetibilidade SGB/CPRM 2018.",
      sourceDatasetIds: [
        DATASET_IDS.sgb,
        DATASET_IDS.hydrology,
        DATASET_IDS.ibge,
        DATASET_IDS.plazas,
        DATASET_IDS.sirens,
        DATASET_IDS.supportPoints,
        DATASET_IDS.nupdec,
        DATASET_IDS.shelters,
        DATASET_IDS.schools,
        DATASET_IDS.health
      ],
      layerFile: "data/processed/layers/neighborhood-scores.geojson",
      legend: [
        { label: "Muito alto", color: "#b63d35" },
        { label: "Alto", color: "#d97844" },
        { label: "Elevado", color: "#e4bd59" },
        { label: "Moderado", color: "#7aa974" },
        { label: "Mais baixo", color: "#5d8aa8" }
      ]
    },
    {
      id: "flood-susceptibility-context",
      family: "Alagamentos, inundação e risco hídrico urbano",
      label: "Contexto de suscetibilidade à inundação SGB/CPRM",
      status: "available",
      resolution: "Polígonos SGB alocados aos bairros por centróide para triagem.",
      temporalCoverage: "Pacote de suscetibilidade SGB/CPRM 2018.",
      sourceDatasetIds: [DATASET_IDS.sgb],
      layerFile: "data/processed/layers/neighborhood-scores.geojson",
      legend: [
        { label: "Maior participação ponderada de suscetibilidade", color: "#b63d35" },
        { label: "Menor participação ponderada de suscetibilidade", color: "#f1c27d" }
      ]
    },
    {
      id: "drainage-hydrography-pressure",
      family: "Saneamento e drenagem",
      label: "Pressão de hidrografia e cursos d'água cobertos",
      status: "available",
      resolution: "Linhas de hidrografia municipal associadas pelo código de bairro Data.Rio.",
      temporalCoverage: "Retrato atual do portal Data.Rio.",
      sourceDatasetIds: [DATASET_IDS.hydrology],
      layerFile: "data/processed/layers/hydrography.geojson",
      legend: [
        { label: "Curso d'água coberto", color: "#7d5a44" },
        { label: "Curso d'água aberto", color: "#3b84a5" }
      ]
    },
    {
      id: "social-exposure-census2022",
      family: "Vulnerabilidade, demografia e condições sociais",
      label: "Exposição populacional do Censo 2022",
      status: "available",
      resolution: "Setores censitários do IBGE agregados por NM_BAIRRO aos bairros oficiais.",
      temporalCoverage: "Censo 2022.",
      sourceDatasetIds: [DATASET_IDS.ibge],
      layerFile: "data/processed/layers/neighborhood-scores.geojson",
      legend: [
        { label: "Maior densidade populacional", color: "#8065b1" },
        { label: "Menor densidade populacional", color: "#c8b7df" }
      ]
    },
    {
      id: "green-public-space-deficit",
      family: "Cobertura vegetal e infraestrutura verde",
      label: "Déficit de áreas verdes públicas",
      status: "available",
      resolution: "Polígonos de praças municipais agregados por código de bairro.",
      temporalCoverage: "Retrato atual do portal Data.Rio.",
      sourceDatasetIds: [DATASET_IDS.plazas],
      layerFile: "data/processed/layers/plazas.geojson",
      legend: [
        { label: "Menor área de praça por morador", color: "#9a6a3a" },
        { label: "Maior área de praça por morador", color: "#5f9d73" }
      ]
    },
    {
      id: "protected-area-context",
      family: "Cobertura vegetal e infraestrutura verde",
      label: "Contexto de áreas protegidas",
      status: "available",
      resolution: "Polígonos municipais de áreas protegidas.",
      temporalCoverage: "Retrato atual do portal Data.Rio.",
      sourceDatasetIds: [DATASET_IDS.protectedAreas],
      layerFile: "data/processed/layers/protected-areas.geojson",
      legend: [
        { label: "Uso sustentável / proteção", color: "#2f7d5b" },
        { label: "Contexto de amortecimento / patrimônio", color: "#8a9d54" }
      ]
    },
    {
      id: "civil-defense-risk-context",
      family: "Alagamentos, inundação e risco hídrico urbano",
      label: "Contexto de risco e resposta da Defesa Civil",
      status: "available",
      resolution: "Pontos municipais de Defesa Civil alocados aos bairros.",
      temporalCoverage: "Retrato atual do portal Data.Rio.",
      sourceDatasetIds: [
        DATASET_IDS.sirens,
        DATASET_IDS.supportPoints,
        DATASET_IDS.nupdec,
        DATASET_IDS.shelters
      ],
      layerFile: "data/processed/layers/civil-defense-context.geojson",
      legend: [
        { label: "Infraestrutura de alerta / resposta", color: "#c24f55" },
        { label: "Organização de apoio", color: "#e0a93f" }
      ]
    },
    {
      id: "public-facility-opportunity-anchors",
      family: "Equipamentos públicos, terras públicas e espaços de oportunidade",
      label: "Equipamentos públicos como âncoras de oportunidade",
      status: "available",
      resolution: "Pontos de escolas municipais e serviços de saúde alocados aos bairros.",
      temporalCoverage: "Retrato atual do portal Data.Rio.",
      sourceDatasetIds: [DATASET_IDS.schools, DATASET_IDS.health],
      layerFile: "data/processed/layers/public-facilities.geojson",
      legend: [
        { label: "Escola municipal", color: "#4f8cc9" },
        { label: "Serviço de saúde", color: "#7d68b3" }
      ]
    },
    {
      id: "snis-sanitation-temporal-context",
      family: "Evidência temporal",
      label: "Contexto de saneamento SNIS",
      status: "available",
      resolution: "Linhas por município/prestador, sem discriminação por bairro.",
      temporalCoverage: "Exportação Rio AE capturada para 1995-2022.",
      sourceDatasetIds: [DATASET_IDS.snis],
      layerFile: "data/processed/evidence/sanitation-timeseries-snis-rio-ae.json",
      timelineReady: false,
      legend: [{ label: "Apenas contexto", color: "#7f8f8b" }]
    }
  ];
}

function buildSolutionMapping() {
  return [
    {
      id: "rain-gardens-bioretention",
      label: "Jardins de chuva e biorretenção",
      evidencePattern:
        "Alta exposição a inundação ou pressão de drenagem, com ruas e equipamentos públicos como âncoras de oportunidade.",
      evidenceLayerIds: [
        "urban-water-prioritization-score",
        "drainage-hydrography-pressure",
        "public-facility-opportunity-anchors"
      ],
      limitations:
        "Exige verificação local de faixa disponível, interferências de redes, infiltração do solo e viabilidade de manutenção."
    },
    {
      id: "permeable-surfaces",
      label: "Superfícies permeáveis",
      evidencePattern:
        "Alta pressão de drenagem combinada com baixa oferta de áreas verdes públicas em bairros densos.",
      evidenceLayerIds: [
        "drainage-hydrography-pressure",
        "green-public-space-deficit"
      ],
      limitations:
        "O potencial de retrofit de superfícies precisa ser confirmado com dados de titularidade e condição do pavimento."
    },
    {
      id: "street-tree-shade-corridors",
      label: "Arborização viária e corredores de sombra",
      evidencePattern:
        "Alta exposição social e déficit de áreas verdes, especialmente onde equipamentos públicos podem ancorar rotas locais.",
      evidenceLayerIds: [
        "social-exposure-census2022",
        "green-public-space-deficit",
        "public-facility-opportunity-anchors"
      ],
      limitations:
        "O plantio exige checagem de largura de calçada, redes subterrâneas e adequação de espécies."
    },
    {
      id: "riparian-restoration",
      label: "Restauração ripária",
      evidencePattern:
        "Alta densidade de hidrografia associada a contexto de suscetibilidade à inundação.",
      evidenceLayerIds: [
        "drainage-hydrography-pressure",
        "flood-susceptibility-context"
      ],
      limitations:
        "Requer avaliação em escala de lote sobre condição do canal, faixas de afastamento e situação fundiária."
    },
    {
      id: "floodable-parks-retention",
      label: "Parques alagáveis e áreas de retenção",
      evidencePattern:
        "Alta exposição a inundação com contexto de praças públicas ou áreas protegidas.",
      evidenceLayerIds: [
        "urban-water-prioritization-score",
        "green-public-space-deficit",
        "protected-area-context"
      ],
      limitations:
        "É apenas uma classe de solução; modelagem hidráulica e disponibilidade fundiária são obrigatórias antes do projeto."
    },
    {
      id: "green-roofs-public-facilities",
      label: "Telhados verdes em equipamentos públicos",
      evidencePattern:
        "Alta densidade de equipamentos públicos em bairros densos ou com déficit de áreas verdes.",
      evidenceLayerIds: [
        "public-facility-opportunity-anchors",
        "green-public-space-deficit"
      ],
      limitations:
        "Titularidade do edifício, estrutura da cobertura, acesso e capacidade de manutenção ainda são desconhecidos nesta fase."
    },
    {
      id: "urban-micro-parks",
      label: "Microparques urbanos e infraestrutura verde de bolso",
      evidencePattern:
        "Alta exposição populacional e baixa área de praça por morador.",
      evidenceLayerIds: [
        "social-exposure-census2022",
        "green-public-space-deficit"
      ],
      limitations:
        "Exige confirmação de terrenos vagos ou públicos e desenvolvimento de projeto em escala comunitária."
    }
  ];
}

function buildOpportunitySummaries(neighborhoods, planningAreas, solutionMapping) {
  const summaries = {};
  for (const record of neighborhoods) {
    summaries[record.id] = {
      territoryId: record.id,
      prioritizationStatus: record.score === null ? "pending" : "scored",
      score: record.score,
      scoreCategory: record.score_category,
      signals: buildSignals(record),
      solutionClasses: suggestSolutions(record, solutionMapping),
      technicalLens: technicalLens(record),
      scienceCommunicationLens: scienceLens(record)
    };
  }

  for (const record of planningAreas) {
    summaries[record.id] = {
      territoryId: record.id,
      prioritizationStatus: record.score === null ? "pending" : "scored",
      score: record.score,
      scoreCategory: record.score_category,
      signals: [
        signal(
          "Pontuação ponderada por população",
          `${formatNumber(record.score)}/100 (${formatScoreCategory(record.score_category)})`,
          "urban-water-prioritization-score"
        ),
        signal(
          "Bairros",
          `${record.neighborhood_count} bairros oficiais`,
          "urban-water-prioritization-score"
        )
      ],
      solutionClasses: suggestSolutions(record, solutionMapping),
      technicalLens:
        `${record.name} agrega ${record.neighborhood_count} bairros oficiais. As pontuações dos componentes são ponderadas por população quando a população do Censo 2022 está disponível; nos demais casos, são ponderadas por área.`,
      scienceCommunicationLens:
        `${record.name} é uma síntese ampla por Área de Planejamento. Use o detalhamento por bairro antes de interpretar onde uma classe de solução baseada na natureza é mais adequada.`
    };
  }

  return summaries;
}

function buildSignals(record) {
  return [
    signal(
      "Pontuação hídrica urbana",
      `${formatNumber(record.score)}/100 (${formatScoreCategory(record.score_category)})`,
      "urban-water-prioritization-score"
    ),
    signal(
      "Componente de exposição à inundação",
      `${formatNumber(record.components.flood_exposure)}/100`,
      "flood-susceptibility-context"
    ),
    signal(
      "Pressão de drenagem",
      `${formatNumber(record.components.drainage_pressure)}/100; ${formatNumber(record.hydrology_density_m_per_km2)} m/km² de hidrografia`,
      "drainage-hydrography-pressure"
    ),
    signal(
      "Exposição populacional",
      record.population_total === null
        ? "Correspondência de bairro no Censo indisponível"
        : `${formatInteger(record.population_total)} moradores; ${formatNumber(record.population_density_per_km2)} moradores/km²`,
      "social-exposure-census2022"
    ),
    signal(
      "Déficit de áreas verdes públicas",
      record.plaza_area_m2_per_1000_residents === null
        ? "Sem denominador de moradores disponível"
        : `${formatNumber(record.plaza_area_m2_per_1000_residents)} m² de praça / 1.000 moradores`,
      "green-public-space-deficit"
    )
  ];
}

function suggestSolutions(record, solutionMapping) {
  const selected = [];
  const components = record.components ?? {};

  if ((components.flood_exposure ?? 0) >= 60 && (components.drainage_pressure ?? 0) >= 50) {
    selected.push(solutionById(solutionMapping, "rain-gardens-bioretention"));
    selected.push(solutionById(solutionMapping, "permeable-surfaces"));
  }
  if ((components.green_space_deficit ?? 0) >= 60 && (components.social_exposure ?? 0) >= 50) {
    selected.push(solutionById(solutionMapping, "street-tree-shade-corridors"));
    selected.push(solutionById(solutionMapping, "urban-micro-parks"));
  }
  if ((components.flood_exposure ?? 0) >= 65 && (record.plaza_count ?? 0) > 0) {
    selected.push(solutionById(solutionMapping, "floodable-parks-retention"));
  }
  if ((record.hydrology_density_m_per_km2 ?? 0) >= 500) {
    selected.push(solutionById(solutionMapping, "riparian-restoration"));
  }
  if ((components.opportunity_space ?? 0) >= 60) {
    selected.push(solutionById(solutionMapping, "green-roofs-public-facilities"));
  }
  if (selected.length === 0) {
    selected.push(solutionById(solutionMapping, "street-tree-shade-corridors"));
  }

  return dedupeById(selected)
    .slice(0, 4)
    .map((solution) => ({
      label: solution.label,
      rationale: solution.evidencePattern,
      sourceMode: "processed"
    }));
}

function solutionById(solutionMapping, id) {
  const solution = solutionMapping.find((item) => item.id === id);
  if (!solution) throw new Error(`Missing solution mapping: ${id}`);
  return solution;
}

function technicalLens(record) {
  return [
    `Pontuação ${formatNumber(record.score)}/100 a partir de componentes ranqueados por percentil: inundação ${formatNumber(record.components.flood_exposure)}, drenagem ${formatNumber(record.components.drainage_pressure)}, exposição social ${formatNumber(record.components.social_exposure)}, déficit verde ${formatNumber(record.components.green_space_deficit)}, contexto de Defesa Civil ${formatNumber(record.components.civil_defense_context)} e espaço de oportunidade ${formatNumber(record.components.opportunity_space)}.`,
    `Insumos centrais: suscetibilidade SGB/CPRM 2018, camadas Data.Rio de hidrografia, praças, equipamentos e Defesa Civil, além da população do Censo IBGE 2022 agregada aos bairros Data.Rio.`,
    `Cautela principal: a pontuação é um modelo defensável de triagem. Ela não é modelo hidráulico, certidão legal de risco, diagnóstico de saneamento nem projeto final.`
  ].join(" ");
}

function scienceLens(record) {
  if (record.score === null) {
    return "Este território ainda não tem evidência curada suficiente para receber uma pontuação.";
  }

  return `Este território está na faixa de triagem ${formatScoreBand(record.score_category)} para oportunidade hídrica urbana e soluções baseadas na natureza. O resultado indica onde as evidências se sobrepõem; vistorias locais e estudos de engenharia ainda são necessários antes de escolher um projeto.`;
}

function signal(label, value, evidenceLayerId) {
  return {
    label,
    value,
    evidenceLayerId,
    sourceMode: "processed"
  };
}

function buildSnisTemporalContext(config, data) {
  const indicatorCodes = [
    "in015",
    "in016",
    "in023",
    "in047",
    "in049",
    "in055",
    "in056"
  ];
  const model = config.colModel ?? [];
  const names = config.colNames ?? [];
  const indexByName = new Map(model.map((column, index) => [column.name, index]));
  const rows = (data.pages ?? []).flatMap((page) => page.rows ?? []);

  const providerRecords = rows.map((row) => {
    const cell = row.cell ?? [];
    const record = {
      municipalityCode: cell[indexByName.get("cod_mun")],
      municipality: cell[indexByName.get("nom_mun")],
      state: cell[indexByName.get("sgl_est")],
      year: Number(cell[indexByName.get("ano_ref")]),
      providerCode: cell[indexByName.get("cod_psv")],
      provider: cell[indexByName.get("psv_nom")],
      providerAcronym: cell[indexByName.get("psv_sgl")],
      serviceType: cell[indexByName.get("nom_srv")],
      indicators: {}
    };

    for (const code of indicatorCodes) {
      const index = indexByName.get(code);
      if (index === undefined) continue;
      record.indicators[code.toUpperCase()] = nullableNumber(cell[index]);
    }
    return record;
  });

  const dictionary = {};
  for (const code of indicatorCodes) {
    const index = indexByName.get(code);
    if (index !== undefined) {
      dictionary[code.toUpperCase()] = names[index];
    }
  }

  const years = [...new Set(providerRecords.map((record) => record.year))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  return {
    schemaVersion: "phase2.snis-context.v1",
    sourceDatasetId: DATASET_IDS.snis,
    comparableForTimeline: false,
    reasonTimelineNotReady:
      "A composição dos prestadores e seus territórios de atendimento variam ao longo do tempo; as linhas capturadas são contexto municipal/por prestador, não evidência discriminada por bairro.",
    years,
    indicatorDictionary: dictionary,
    providerRecords,
    summary: {
      hasTemporalEvidence: true,
      timelineReady: false,
      temporalCoverage: years.length ? `${years[0]}-${years[years.length - 1]}` : "desconhecida",
      limitation:
        "O SNIS é promovido apenas como contexto de saneamento; ele é intencionalmente excluído da pontuação por bairro."
    }
  };
}

async function writeLayerFiles(raw, territorial, neighborhoods) {
  const layerFiles = {
    planningAreas: "data/processed/layers/planning-areas.geojson",
    administrativeRegions: "data/processed/layers/administrative-regions.geojson",
    neighborhoods: "data/processed/layers/neighborhoods.geojson",
    neighborhoodScores: "data/processed/layers/neighborhood-scores.geojson",
    hydrography: "data/processed/layers/hydrography.geojson",
    subBasins: "data/processed/layers/sub-basins.geojson",
    plazas: "data/processed/layers/plazas.geojson",
    protectedAreas: "data/processed/layers/protected-areas.geojson",
    publicFacilities: "data/processed/layers/public-facilities.geojson",
    civilDefense: "data/processed/layers/civil-defense-context.geojson",
    monitoringStations: "data/processed/layers/monitoring-stations.geojson"
  };

  const scoreById = new Map(neighborhoods.map((record) => [record.id, record]));
  await writeGeoJson(layerFiles.planningAreas, {
    type: "FeatureCollection",
    name: "planning-areas",
    features: territorial.planningAreaUnits.map((unit) => unit.geometry)
  });
  await writeGeoJson(layerFiles.administrativeRegions, {
    type: "FeatureCollection",
    name: "administrative-regions",
    features: territorial.administrativeRegionUnits.map((unit) => unit.geometry)
  });
  await writeGeoJson(layerFiles.neighborhoods, {
    type: "FeatureCollection",
    name: "neighborhoods",
    features: territorial.neighborhoodUnits.map((unit) => unit.geometry)
  });
  await writeGeoJson(layerFiles.neighborhoodScores, {
    type: "FeatureCollection",
    name: "neighborhood-scores",
    features: territorial.neighborhoodUnits.map((unit) => {
      const score = scoreById.get(unit.id);
      return {
        ...unit.geometry,
        properties: {
          ...unit.geometry.properties,
          score: score?.score ?? null,
          scoreCategory: score?.score_category ?? "pending",
          scoreRankCitywide: score?.score_rank_citywide ?? null,
          components: score?.components ?? null,
          populationTotal: score?.population_total ?? null,
          hydrologyDensityMPerKm2: score?.hydrology_density_m_per_km2 ?? null,
          plazaAreaM2Per1000Residents:
            score?.plaza_area_m2_per_1000_residents ?? null
        }
      };
    })
  });

  await writeGeoJson(
    layerFiles.hydrography,
    featureCollectionFromArcgis(raw.hydrology, DATASET_IDS.hydrology, (attrs) => ({
      name: cleanText(attrs.nom_hidro),
      neighborhoodCode: normalizeCode(attrs.cod_bairro),
      neighborhoodName: cleanText(attrs.nom_bairro),
      planningArea: attrs.ap ? `AP${attrs.ap}` : null,
      covered: String(attrs.coberto ?? "").trim().toUpperCase() === "S",
      lengthM: round(toNumber(attrs.Shape__Length ?? attrs.compriment))
    }))
  );
  await writeGeoJson(
    layerFiles.subBasins,
    featureCollectionFromArcgis(raw.subBasins, DATASET_IDS.subBasins, (attrs) => ({
      code: attrs.shi_cd,
      name: cleanText(attrs.shi_nm),
      macroName: cleanText(attrs.shi_nm_macro),
      areaM2: round(toNumber(attrs.Shape__Area))
    }))
  );
  await writeGeoJson(
    layerFiles.plazas,
    featureCollectionFromArcgis(raw.plazas, DATASET_IDS.plazas, (attrs) => ({
      name: cleanText(attrs.nome_completo ?? attrs.nome),
      neighborhoodCode: normalizeCode(attrs.bairro),
      planningArea: attrs.ap ? `AP${attrs.ap}` : null,
      areaM2: round(toNumber(attrs.Shape__Area)),
      implemented: attrs.implantada,
      occupied: attrs.ocupada
    }))
  );
  await writeGeoJson(
    layerFiles.protectedAreas,
    featureCollectionFromArcgis(raw.protectedAreas, DATASET_IDS.protectedAreas, (attrs) => ({
      name: cleanText(attrs.nome),
      category: cleanText(attrs.catmanejo),
      group: cleanText(attrs.grupo),
      areaHa: round(toNumber(attrs.area_ha))
    }))
  );
  await writeGeoJson(layerFiles.publicFacilities, {
    type: "FeatureCollection",
    name: "public-facilities",
    features: [
      ...pointFeatures(raw.schools, DATASET_IDS.schools, (attrs) => ({
        facilityType: "municipal_school",
        name: cleanText(attrs.denominacao ?? attrs.designacao),
        schoolType: cleanText(attrs.tipo)
      })),
      ...pointFeatures(raw.health, DATASET_IDS.health, (attrs) => ({
        facilityType: "health_service",
        name: cleanText(attrs.name),
        category: cleanText(attrs.categorias),
        subcategory: cleanText(attrs.subcategor),
        neighborhoodName: cleanText(attrs.bairro)
      }))
    ]
  });
  await writeGeoJson(layerFiles.civilDefense, {
    type: "FeatureCollection",
    name: "civil-defense-context",
    features: [
      ...pointFeatures(raw.sirens, DATASET_IDS.sirens, (attrs) => ({
        assetType: "siren",
        name: cleanText(attrs.sirene),
        community: cleanText(attrs.nome_favela ?? attrs.favela)
      })),
      ...pointFeatures(raw.supportPoints, DATASET_IDS.supportPoints, (attrs) => ({
        assetType: "support_point",
        name: cleanText(attrs.pontos_apo),
        community: cleanText(attrs.nome_favela ?? attrs.favela)
      })),
      ...pointFeatures(raw.nupdec, DATASET_IDS.nupdec, (attrs) => ({
        assetType: "nupdec",
        name: cleanText(attrs.nome),
        risk: cleanText(attrs.risco)
      })),
      ...pointFeatures(raw.shelters, DATASET_IDS.shelters, (attrs) => ({
        assetType: "shelter",
        name: cleanText(attrs.nome)
      }))
    ]
  });
  await writeGeoJson(
    layerFiles.monitoringStations,
    featureCollectionFromArcgis(
      raw.alertaRioStations,
      DATASET_IDS.alertaRioStations,
      (attrs) => ({
        stationCode: attrs.cod,
        name: cleanText(attrs.est),
        address: cleanText(attrs["endereço"])
      })
    )
  );

  return layerFiles;
}

function buildDataQualityReport(raw, metrics, territorial, sanitationTemporal) {
  const neighborhoods = metrics.neighborhoods;
  return {
    schemaVersion: "phase2.quality.v1",
    generatedAt: new Date().toISOString(),
    sourceFeatureCounts: {
      planningAreas: raw.planningAreas.features.length,
      administrativeRegions: raw.administrativeRegions.features.length,
      neighborhoods: raw.neighborhoods.features.length,
      hydrology: raw.hydrology.features.length,
      subBasins: raw.subBasins.features.length,
      plazas: raw.plazas.features.length,
      protectedAreas: raw.protectedAreas.features.length,
      schools: raw.schools.features.length,
      health: raw.health.features.length,
      civilDefenseSirens: raw.sirens.features.length,
      civilDefenseSupportPoints: raw.supportPoints.features.length,
      civilDefenseNupdec: raw.nupdec.features.length,
      civilDefenseShelters: raw.shelters.features.length,
      alertaRioStations: raw.alertaRioStations.features.length
    },
    territorialUnits: {
      planningAreas: territorial.planningAreaUnits.length,
      administrativeRegions: territorial.administrativeRegionUnits.length,
      neighborhoods: territorial.neighborhoodUnits.length,
      ap3Neighborhoods: territorial.neighborhoodUnits.filter(
        (unit) => unit.planningArea === "AP3"
      ).length
    },
    censusJoin: {
      neighborhoodsWithCensusMetrics: neighborhoods.filter(
        (record) => record.has_census_metrics
      ).length,
      neighborhoodsWithoutCensusMetrics: neighborhoods
        .filter((record) => !record.has_census_metrics)
        .map((record) => record.neighborhood_name)
    },
    scoreCoverage: {
      scoredNeighborhoods: neighborhoods.filter((record) => record.score !== null)
        .length,
      ap3ScoredNeighborhoods: neighborhoods.filter(
        (record) => record.planning_area === "AP3" && record.score !== null
      ).length
    },
    temporalEvidence: sanitationTemporal.summary,
    limitations: [
      "Dados raster de cobertura do solo do MapBiomas foram diferidos até haver um pipeline reprodutível de estatística zonal raster.",
      "SINISA, INEA, IDE.RJ, séries temporais ANA, OSM e alguns produtos de referência SGB permanecem visíveis no catálogo, mas não entram na primeira pontuação.",
      "A alocação dos polígonos SGB usa centróides; isso é aceitável para triagem, mas não para quantificação de perigo com precisão de limite.",
      "A pontuação usa área de praças públicas como proxy de déficit de áreas verdes, não cobertura vegetal completa."
    ]
  };
}

async function buildProvenanceManifest() {
  const promotedSources = Object.values(DATASET_IDS);
  const uniqueSources = [...new Set(promotedSources)].sort();
  const entries = [];

  for (const datasetId of uniqueSources) {
    const sourceDir = findRawDatasetDir(datasetId);
    if (!sourceDir) continue;
    const provenancePath = path.join(sourceDir, "provenance.json");
    entries.push({
      datasetId,
      rawStoragePath: relativePath(sourceDir),
      provenancePath: relativePath(provenancePath),
      provenanceSha256: await sha256(provenancePath)
    });
  }

  return {
    schemaVersion: "phase2.provenance.v1",
    generatedAt: new Date().toISOString(),
    entries
  };
}

function findRawDatasetDir(datasetId) {
  const families = [
    "data-rio",
    "ibge",
    "snis",
    "sgb-cprm"
  ];
  for (const family of families) {
    const candidate = path.join(rawDir, family, datasetId);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function toScoreComponentRecord(record) {
  return {
    territory_id: record.id,
    territory_name: record.neighborhood_name,
    unit_type: "neighborhood",
    planning_area: record.planning_area,
    administrative_region_name: record.administrative_region_name,
    score: record.score,
    score_category: record.score_category,
    score_rank_citywide: record.score_rank_citywide,
    ...record.components,
    population_total: record.population_total,
    population_density_per_km2: record.population_density_per_km2,
    hydrology_length_m: round(record.hydrology_length_m),
    hydrology_density_m_per_km2: record.hydrology_density_m_per_km2,
    covered_hydrology_share: record.covered_hydrology_share,
    sgb_inundacao_weighted_area_index: record.sgb_inundacao_weighted_area_index,
    sgb_inundacao_high_area_share: record.sgb_inundacao_high_area_share,
    plaza_count: record.plaza_count,
    plaza_area_m2: round(record.plaza_area_m2),
    plaza_area_m2_per_1000_residents:
      record.plaza_area_m2_per_1000_residents,
    civil_defense_assets: record.civil_defense_assets,
    public_facility_count: record.public_facility_count,
    assignment_notes: record.assignment_notes.join("; ")
  };
}

function toPlanningAreaScoreRecord(record) {
  return {
    territory_id: record.id,
    territory_name: record.name,
    unit_type: "planning_area",
    planning_area: record.planning_area,
    score: record.score,
    score_category: record.score_category,
    ...record.components,
    neighborhood_count: record.neighborhood_count,
    population_total: record.population_total,
    official_area_km2: record.official_area_km2,
    hydrology_length_m: record.hydrology_length_m,
    plaza_area_m2: record.plaza_area_m2,
    civil_defense_assets: record.civil_defense_assets,
    public_facility_count: record.public_facility_count
  };
}

function featureCollectionFromArcgis(source, datasetId, propertyMapper) {
  return {
    type: "FeatureCollection",
    name: datasetId,
    features: source.features.map((feature) =>
      esriFeatureToGeoJsonFeature(feature, source, {
        sourceDatasetId: datasetId,
        ...propertyMapper(feature.attributes)
      })
    )
  };
}

function pointFeatures(source, datasetId, propertyMapper) {
  return source.features.map((feature) =>
    esriFeatureToGeoJsonFeature(feature, source, {
      sourceDatasetId: datasetId,
      ...propertyMapper(feature.attributes)
    })
  );
}

function esriFeatureToGeoJsonFeature(feature, source, properties) {
  return {
    type: "Feature",
    properties,
    geometry: esriGeometryToGeoJson(feature.geometry, source.geometryType, source.spatialReference)
  };
}

function esriGeometryToGeoJson(geometry, geometryType, spatialReference) {
  if (!geometry) return null;
  if (geometryType === "esriGeometryPoint" || ("x" in geometry && "y" in geometry)) {
    return {
      type: "Point",
      coordinates: projectToWgs84([geometry.x, geometry.y], spatialReference)
    };
  }

  if (geometry.paths) {
    const paths = geometry.paths.map((path) =>
      path.map((point) => projectToWgs84(point, spatialReference))
    );
    return paths.length === 1
      ? { type: "LineString", coordinates: paths[0] }
      : { type: "MultiLineString", coordinates: paths };
  }

  if (geometry.rings) {
    return ringsToGeoJsonPolygon(geometry.rings, spatialReference);
  }

  throw new Error(`Unsupported ESRI geometry: ${JSON.stringify(geometry).slice(0, 100)}`);
}

function ringsToGeoJsonPolygon(rings, spatialReference) {
  const outerRings = [];
  const holeRings = [];

  for (const ring of rings) {
    const signedArea = ringSignedArea(ring);
    if (signedArea <= 0) {
      outerRings.push({ ring, holes: [] });
    } else {
      holeRings.push(ring);
    }
  }

  if (outerRings.length === 0) {
    for (const ring of rings) outerRings.push({ ring, holes: [] });
    holeRings.length = 0;
  }

  for (const hole of holeRings) {
    const point = hole[0];
    const outer = outerRings.find((candidate) => pointInRing(point, candidate.ring));
    if (outer) {
      outer.holes.push(hole);
    } else {
      outerRings.push({ ring: hole, holes: [] });
    }
  }

  const coordinates = outerRings.map(({ ring, holes }) => [
    closeRing(ring.map((point) => projectToWgs84(point, spatialReference))),
    ...holes.map((hole) =>
      closeRing(hole.map((point) => projectToWgs84(point, spatialReference)))
    )
  ]);

  return coordinates.length === 1
    ? { type: "Polygon", coordinates: coordinates[0] }
    : { type: "MultiPolygon", coordinates };
}

function projectToWgs84(point, spatialReference) {
  const wkid = spatialReference?.latestWkid ?? spatialReference?.wkid;
  if (wkid === 4326 || wkid === 4674) {
    return [roundCoordinate(point[0]), roundCoordinate(point[1])];
  }
  if (wkid === 31983) {
    const [longitude, latitude] = proj4("EPSG:31983", "EPSG:4326", point);
    return [roundCoordinate(longitude), roundCoordinate(latitude)];
  }
  throw new Error(`Unsupported spatial reference: ${JSON.stringify(spatialReference)}`);
}

async function readArcgisSource(relativeFilePath) {
  const payload = await readJson(relativeFilePath);
  const responses = payload.responses ? payload.responses : [payload];
  const first = responses.find((response) => response.features) ?? responses[0];
  return {
    spatialReference: first.spatialReference,
    geometryType: first.geometryType,
    fields: first.fields ?? [],
    features: responses.flatMap((response) =>
      (response.features ?? []).map((feature) => ({
        attributes: feature.attributes ?? {},
        geometry: feature.geometry,
        spatialReference: response.spatialReference ?? first.spatialReference
      }))
    )
  };
}

function findContainingNeighborhood(point, neighborhoodUnits) {
  return neighborhoodUnits.find((unit) =>
    pointInFeatureRings(point, unit.rawFeature.geometry.rings)
  );
}

function pointInFeatureRings(point, rings) {
  let inside = false;
  for (const ring of rings) {
    if (pointInRing(point, ring)) inside = !inside;
  }
  return inside;
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function centroidFromRings(rings) {
  if (!Array.isArray(rings) || rings.length === 0) return null;
  let largest = null;
  let largestArea = 0;
  for (const ring of rings) {
    const area = Math.abs(ringSignedArea(ring));
    if (area > largestArea) {
      largestArea = area;
      largest = ring;
    }
  }
  if (!largest) return null;
  return ringCentroid(largest) ?? [
    largest.reduce((sum, point) => sum + point[0], 0) / largest.length,
    largest.reduce((sum, point) => sum + point[1], 0) / largest.length
  ];
}

function ringCentroid(ring) {
  let areaFactor = 0;
  let xSum = 0;
  let ySum = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    const cross = x1 * y2 - x2 * y1;
    areaFactor += cross;
    xSum += (x1 + x2) * cross;
    ySum += (y1 + y2) * cross;
  }
  if (Math.abs(areaFactor) < 1e-9) return null;
  return [xSum / (3 * areaFactor), ySum / (3 * areaFactor)];
}

function ringSignedArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function closeRing(ring) {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function percentileLookup(records, key) {
  const valid = records
    .map((record) => ({ record, value: nullableNumber(record[key]) }))
    .filter((item) => item.value !== null)
    .sort((a, b) => a.value - b.value);
  const values = new Map();

  if (valid.length === 0) {
    return { get: () => null };
  }
  if (valid.length === 1) {
    values.set(valid[0].record, 100);
  } else {
    for (let index = 0; index < valid.length; index += 1) {
      values.set(valid[index].record, (index / (valid.length - 1)) * 100);
    }
  }

  return {
    get(record) {
      return values.has(record) ? round(values.get(record)) : null;
    }
  };
}

function weightedAverage(pairs) {
  let total = 0;
  let weightTotal = 0;
  for (const [value, weight] of pairs) {
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    total += value * weight;
    weightTotal += weight;
  }
  return weightTotal === 0 ? null : total / weightTotal;
}

function scoreCategory(score) {
  if (score === null || score === undefined || !Number.isFinite(score)) return "pending";
  if (score >= 80) return "very_high";
  if (score >= 65) return "high";
  if (score >= 50) return "elevated";
  if (score >= 35) return "moderate";
  return "lower";
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return String(Number(text));
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function toNumber(value) {
  return nullableNumber(value) ?? 0;
}

function divide(numerator, denominator) {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    denominator === 0
  ) {
    return null;
  }
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundCoordinate(value) {
  return Number(value.toFixed(7));
}

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/d";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatInteger(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/d";
  return Math.round(value).toLocaleString("pt-BR");
}

function formatScoreCategory(category) {
  return SCORE_CATEGORY_LABELS[category] ?? category;
}

function formatScoreBand(category) {
  return SCORE_BAND_LABELS[category] ?? formatScoreCategory(category);
}

async function readJson(relativeFilePath) {
  return JSON.parse(
    await readFile(path.join(projectRoot, relativeFilePath), "utf8")
  );
}

async function readCsv(relativeFilePath) {
  const text = await readFile(path.join(projectRoot, relativeFilePath), "utf8");
  const [header, ...rows] = parseCsv(text);
  return rows.map((row) => {
    const record = {};
    header.forEach((field, index) => {
      record[field] = row[index] ?? "";
    });
    return record;
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

async function writeGeoJson(relativeFilePath, payload) {
  await writeJson(path.join(projectRoot, relativeFilePath), {
    ...payload,
    crs: {
      type: "name",
      properties: { name: "EPSG:4326" }
    }
  });
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeCsv(filePath, rows) {
  if (!rows.length) throw new Error(`No CSV rows for ${filePath}`);
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    )
  ];
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

function csvEscape(value) {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function sha256(filePath) {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}
