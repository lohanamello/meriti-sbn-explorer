import type { Feature, FeatureCollection, Geometry } from "geojson";

export type SourceMode = "mock" | "processed";
export type TerritorialUnitType = "municipality" | "district" | "neighborhood" | "census_sector";
export type EvidenceLayerStatus = "mock" | "pending" | "available" | "unavailable";
export type InterpretationLens = "technical" | "science";
export type CollectionStatus = string;
export type PromotionStatus = string;

export interface TerritorialUnit {
  id: string;
  name: string;
  unitType: TerritorialUnitType;
  districtNames: string;
  neighborhoodName?: string | null;
  geometry: Feature<Geometry>;
  sourceMode: SourceMode;
  sourceDatasetId: string;
  areaKm2: number;
  populationTotal: number;
}

export interface EvidenceLegendItem { label: string; color: string }
export interface EvidenceLayer {
  id: string;
  family: string;
  label: string;
  status: EvidenceLayerStatus;
  legend: EvidenceLegendItem[];
  resolution: string;
  temporalCoverage: string;
  sourceDatasetIds: string[];
  limitation?: string;
  layerFile?: string;
  timelineReady?: boolean;
  yearFiles?: Record<string, string>;
  image?: { role: "reference" | "evidence"; coordinates: [[number, number], [number, number], [number, number], [number, number]]; width: number; height: number };
  attribution?: string;
  coverageBufferMeters?: number;
  defaultVisible?: boolean;
  rendering?: { fillOpacity: number; lineDasharray?: number[] };
}
export interface EvidenceSignal {
  label: string;
  value: string;
  evidenceLayerId: string;
  sourceMode: SourceMode;
}
export interface SolutionClass { label: string; rationale: string; sourceMode: SourceMode }
export interface OpportunitySummary {
  territoryId: string;
  status: "available" | "pending";
  signals: EvidenceSignal[];
  solutionClasses: SolutionClass[];
  technicalLens: string;
  scienceCommunicationLens: string;
}
export interface LandCoverObservation {
  vegetationPct: number | null;
  urbanPct: number | null;
  validPixels: number;
  totalPixels: number;
  coveragePct: number;
}
export interface TemporalEvidence {
  hasTemporalEvidence: boolean;
  timelineReady: boolean;
  years: number[];
  defaultYear: number;
  temporalCoverage: string;
  limitation: string;
  observations: Record<string, Record<string, LandCoverObservation>>;
}
export interface Locality {
  id: string;
  name: string;
  geometry: Feature<Geometry>;
  geometryStatus: "approximate_boundary" | "label_point";
  method: string;
  ibgeOverlaps: Array<{ id: string; name: string; intersectionPct: number | null }>;
}
export interface NeighborhoodReference {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDate: string | null;
  municipalListUrl: string;
  limitation: string;
  localities: Locality[];
  comparison: Array<{ name: string; ibgeId: string | null; ibgeName: string | null; localityId: string | null }>;
}
export interface Phase3ExplorerData {
  neighborhoodReference: NeighborhoodReference;
  vegetationResearch: VegetationResearch;
  schemaVersion: string;
  generatedAt: string;
  outputCrs: string;
  sourceMode: SourceMode;
  primaryTerritorialUnit: TerritorialUnitType;
  studyArea: {
    code: string;
    name: string;
    shortName: string;
    boundary: FeatureCollection<Geometry>;
    bounds: [[number, number], [number, number]];
  };
  territorialUnits: TerritorialUnit[];
  evidenceLayers: EvidenceLayer[];
  opportunitySummaries: Record<string, OpportunitySummary>;
  methodology: { title: string; description: string; limitations: string[] };
  temporalEvidence: TemporalEvidence;
  methodologyFiles: string[];
  recentVegetation: {
    sourceId: string; startDate: string; endDate: string; sceneCount: number; resolutionMeters: number;
    minimumObservations: number; thresholds: number[]; rgbDate: string; sceneIds: string[];
    observations: Record<string, { validPixels: number; totalPixels: number; coveragePct: number; medianNdvi: number | null;
      vegetationSignalPct: Record<string, number | null>; minimumObservations: number }>;
  };
  protectedAreas: Array<{ id: string; name: string; category: string; legalAct: string; registeredAreaHa: number; sourceUrl: string; coordinates: [number, number] }>;
  sourceReferences: Array<{
    id: string;
    name: string;
    institution: string;
    url: string;
    period: string;
    license: string;
  }>;
}
export interface VegetationResearch {
  fieldEvidence: {
    sourceId: string; sourceUrl: string; publicationUrl: string;
    referencePeriod: { start: string; end: string }; publicationDate: string;
    scope: string; denominator: string; validationUse: string;
    summary: { totalCensusSectors: number; sectorsWithPublishedFaceObservations: number; sectorsWithObservedTreePresence: number };
    observations: Record<string, {
      residents: StreetTreeObservation | null; households: StreetTreeObservation | null; faces: StreetTreeObservation | null;
      observedTreePresence: boolean | null;
    }>;
  };
  referenceAudit: {
    auditedAt: string; targetDate: string; sampleCells: number; acceptedFractionLabels: number;
    openReference: { acquisitionDate: string; sourceUrl: string; preparedPanels: number; attribution: string; displayMethod: string };
    aiPilot: { reviewedCells: number; likelyVegetationPresenceCells: number; indeterminatePresenceCells: number };
    barriers: string[];
  };
  canopy: {
    sourceId: string; imageryDates: string[]; publicationYear: number; thresholdsMeters: number[];
    observations: Record<string, {
      coveragePct: number; modeledCanopyAreaHa: Record<string, number | null>; modeledCanopyPct: Record<string, number | null>;
      mapBiomas2019Comparison: { commonValidAreaHa: number; modeledHeightAtLeast3mAreaHa: number;
        byMapBiomasClass: Record<string, { areaHa: number; shareOfModeledCanopyPct: number | null }> };
    }>;
    protectedAreaObservations: Record<string, unknown>;
  };
  seasonality: {
    sourceId: string; year: number; sceneCount: number;
    scenes: Array<{ date: string; month: number; validPct: number; ndviAbove04Pct: number }>;
    observations: Record<string, { coveragePct: number; medianNdviAbove04Pct: number | null; recurrentSignalPct: number | null; variableSignalPct: number | null }>;
  };
  visualReference: { sourceId: string; date: string; resolutionMeters: number; dataPresencePct: number; cloudFreePct: number | null };
  validation: { designId: string; status: string; sampleCells: number; referenceLabelsCompleted: number;
    estimandDate: string; stratificationImagePeriod: { start: string; end: string }; planningNormal95HalfWidthPctUpperBound: number };
}
export interface StreetTreeObservation {
  surveyedTotal: number | null; withTrees: number | null; withTreesPct: number | null;
  skipped: number | null; answeredPct: number | null;
}
export interface CatalogDataset {
  id: string;
  source_name: string;
  source_institution: string;
  source_url: string;
  acquisition_route: string;
  access_status: string;
  license: string;
  spatial_coverage: string;
  spatial_resolution: string;
  temporal_coverage: string;
  format: string;
  crs: string;
  evidence_family: string;
  potential_use: string;
  known_limitations: string;
  raw_storage_path: string;
  collection_status: CollectionStatus;
  promotion_status: PromotionStatus;
  collected_at: string;
  notes: string;
}

export interface CatalogStats {
  total: number;
  downloaded: number;
  candidates: number;
  deferred: number;
  promoted: number;
  temporalPromoted: number;
}
