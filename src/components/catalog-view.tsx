"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  RotateCcw,
  Search,
  Table2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CatalogDataset, CatalogStats } from "@/types/phase3";

import { formatStatusLabel, StatusBadge } from "./status-badge";

const ALL = "all";

type SortDirection = "asc" | "desc";
type SortKey =
  | "source_name"
  | "source_institution"
  | "evidence_family"
  | "collection_status"
  | "promotion_status"
  | "spatial_coverage"
  | "license";

interface SortDescriptor {
  key: SortKey;
  direction: SortDirection;
}

const SORT_COLUMNS: Array<{
  key: SortKey;
  label: string;
}> = [
  { key: "source_name", label: "Fonte" },
  { key: "source_institution", label: "Instituição" },
  { key: "evidence_family", label: "Família" },
  { key: "collection_status", label: "Coleta" },
  { key: "promotion_status", label: "Promoção" },
  { key: "spatial_coverage", label: "Cobertura" },
  { key: "license", label: "Licença" }
];

const STATUS_EXPLANATIONS = [
  {
    label: "Baixado",
    value: "downloaded",
    description:
      "A fonte foi localizada, coletada e preservada no repositório bruto com metadados de procedência. Ainda não significa que ela entrou no mapa."
  },
  {
    label: "Candidato",
    value: "candidate",
    description:
      "A fonte parece útil para a análise, mas ainda precisa passar por curadoria, validação espacial ou revisão metodológica."
  },
  {
    label: "Diferido",
    value: "deferred",
    description:
      "A fonte foi adiada para uma etapa posterior. Ela continua documentada, mas exige processamento extra, confirmação externa ou uma decisão metodológica antes de ser usada."
  },
  {
    label: "Promovido",
    value: "promoted",
    description:
      "A fonte passou pela curadoria e foi transformada em evidência processada, podendo alimentar camadas, indicadores ou leituras do app."
  }
];

export function CatalogView({
  datasets,
  stats
}: {
  datasets: CatalogDataset[];
  stats: CatalogStats;
}) {
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState(ALL);
  const [promotionFilter, setPromotionFilter] = useState(ALL);
  const [familyFilter, setFamilyFilter] = useState(ALL);
  const [coverageFilter, setCoverageFilter] = useState(ALL);
  const [licenseFilter, setLicenseFilter] = useState(ALL);
  const [sourceGroupFilters, setSourceGroupFilters] = useState<string[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    key: "source_name",
    direction: "asc"
  });
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  const collectionStatuses = useMemo(
    () => uniqueStatuses(datasets.map((dataset) => dataset.collection_status)),
    [datasets]
  );
  const promotionStatuses = useMemo(
    () => uniqueStatuses(datasets.map((dataset) => dataset.promotion_status)),
    [datasets]
  );
  const evidenceFamilies = useMemo(
    () => uniqueValues(datasets.map((dataset) => dataset.evidence_family)),
    [datasets]
  );
  const coverageOptions = useMemo(
    () => uniqueValues(datasets.map((dataset) => dataset.spatial_coverage)),
    [datasets]
  );
  const licenseOptions = useMemo(
    () => uniqueValues(datasets.map((dataset) => dataset.license)),
    [datasets]
  );
  const sourceGroups = useMemo(
    () => uniqueValues(datasets.map((dataset) => getSourceGroup(dataset))),
    [datasets]
  );

  const filteredDatasets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return datasets.filter((dataset) => {
      const sourceGroup = getSourceGroup(dataset);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          dataset.id,
          dataset.source_name,
          dataset.source_institution,
          sourceGroup,
          dataset.evidence_family,
          dataset.potential_use,
          dataset.notes,
          dataset.license
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCollection =
        collectionFilter === ALL ||
        dataset.collection_status === collectionFilter;
      const matchesPromotion =
        promotionFilter === ALL ||
        dataset.promotion_status === promotionFilter;
      const matchesFamily =
        familyFilter === ALL || dataset.evidence_family === familyFilter;
      const matchesCoverage =
        coverageFilter === ALL || dataset.spatial_coverage === coverageFilter;
      const matchesLicense =
        licenseFilter === ALL || dataset.license === licenseFilter;
      const matchesSourceGroup =
        sourceGroupFilters.length === 0 ||
        sourceGroupFilters.includes(sourceGroup);

      return (
        matchesQuery &&
        matchesCollection &&
        matchesPromotion &&
        matchesFamily &&
        matchesCoverage &&
        matchesLicense &&
        matchesSourceGroup
      );
    });
  }, [
    collectionFilter,
    coverageFilter,
    datasets,
    familyFilter,
    licenseFilter,
    promotionFilter,
    query,
    sourceGroupFilters
  ]);

  const sortedDatasets = useMemo(
    () => sortCatalogDatasets(filteredDatasets, sortDescriptor),
    [filteredDatasets, sortDescriptor]
  );

  const activeFilterCount =
    Number(query.trim().length > 0) +
    Number(collectionFilter !== ALL) +
    Number(promotionFilter !== ALL) +
    Number(familyFilter !== ALL) +
    Number(coverageFilter !== ALL) +
    Number(licenseFilter !== ALL) +
    sourceGroupFilters.length;

  useEffect(() => {
    if (!sourcesModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSourcesModalOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sourcesModalOpen]);

  function toggleSourceGroup(sourceGroup: string) {
    setSourceGroupFilters((current) =>
      current.includes(sourceGroup)
        ? current.filter((value) => value !== sourceGroup)
        : [...current, sourceGroup]
    );
  }

  function resetFilters() {
    setQuery("");
    setCollectionFilter(ALL);
    setPromotionFilter(ALL);
    setFamilyFilter(ALL);
    setCoverageFilter(ALL);
    setLicenseFilter(ALL);
    setSourceGroupFilters([]);
  }

  function toggleSort(key: SortKey) {
    setSortDescriptor((current) => {
      if (current.key !== key) {
        return { key, direction: "asc" };
      }

      return {
        key,
        direction: current.direction === "asc" ? "desc" : "asc"
      };
    });
  }

  return (
    <section className="catalog-view">
      <div className="catalog-toolbar">
        <div className="catalog-tabs" aria-label="Navegação do catálogo">
          <button type="button" aria-pressed="true">
            <Table2 size={16} aria-hidden="true" />
            <span>Dados</span>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={sourcesModalOpen}
            onClick={() => setSourcesModalOpen(true)}
          >
            <FileText size={16} aria-hidden="true" />
            <span>Fontes</span>
          </button>
        </div>
        <span className="catalog-selection-summary">
          {sortedDatasets.length} de {datasets.length} fontes na seleção
        </span>
      </div>

      <div className="catalog-stats">
        <Metric label="Baixadas" value={stats.downloaded} />
        <Metric label="Candidatas" value={stats.candidates} />
        <Metric label="Diferidas" value={stats.deferred} />
        <Metric label="Promovidas" value={stats.promoted} />
      </div>

      <section className="status-guide" aria-labelledby="status-guide-title">
        <div>
          <p className="eyebrow">Glossário</p>
          <h2 id="status-guide-title">O que significam os status</h2>
        </div>
        <div className="status-guide__items">
          {STATUS_EXPLANATIONS.map((status) => (
            <article key={status.value}>
              <h3>{status.label}</h3>
              <p>{status.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="catalog-filters">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar fonte</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por fonte, instituição, família, licença ou nota"
          />
        </label>

        <label>
          <span>Coleta</span>
          <select
            aria-label="Filtro por coleta"
            value={collectionFilter}
            onChange={(event) => setCollectionFilter(event.target.value)}
          >
            <option value={ALL}>Todas</option>
            {collectionStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Promoção</span>
          <select
            aria-label="Filtro por promoção"
            value={promotionFilter}
            onChange={(event) => setPromotionFilter(event.target.value)}
          >
            <option value={ALL}>Todas</option>
            {promotionStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Família</span>
          <select
            aria-label="Filtro por família de evidência"
            value={familyFilter}
            onChange={(event) => setFamilyFilter(event.target.value)}
          >
            <option value={ALL}>Todas</option>
            {evidenceFamilies.map((family) => (
              <option key={family} value={family}>
                {formatCatalogText(family)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Cobertura</span>
          <select
            aria-label="Filtro por cobertura"
            value={coverageFilter}
            onChange={(event) => setCoverageFilter(event.target.value)}
          >
            <option value={ALL}>Todas</option>
            {coverageOptions.map((coverage) => (
              <option key={coverage} value={coverage}>
                {formatCatalogText(coverage)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Licença</span>
          <select
            aria-label="Filtro por licença"
            value={licenseFilter}
            onChange={(event) => setLicenseFilter(event.target.value)}
          >
            <option value={ALL}>Todas</option>
            {licenseOptions.map((license) => (
              <option key={license} value={license}>
                {formatCatalogText(license)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="source-filter-group">
          <legend>Fonte institucional</legend>
          <div className="source-filter-chips">
            {sourceGroups.map((sourceGroup) => (
              <label className="filter-chip" key={sourceGroup}>
                <input
                  type="checkbox"
                  checked={sourceGroupFilters.includes(sourceGroup)}
                  onChange={() => toggleSourceGroup(sourceGroup)}
                />
                <span>{sourceGroup}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className="clear-filters"
          type="button"
          disabled={activeFilterCount === 0}
          onClick={resetFilters}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Limpar filtros</span>
        </button>
      </div>

      <div className="catalog-table-wrap">
        <table className="catalog-table">
          <caption>
            {sortedDatasets.length} fontes exibidas
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filtros ativos` : ""}
          </caption>
          <thead>
            <tr>
              {SORT_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  aria-sort={getAriaSort(column.key, sortDescriptor)}
                >
                  <button
                    className="sort-button"
                    type="button"
                    onClick={() => toggleSort(column.key)}
                  >
                    <span>{column.label}</span>
                    <SortIcon
                      active={sortDescriptor.key === column.key}
                      direction={sortDescriptor.direction}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDatasets.map((dataset) => (
              <tr key={dataset.id}>
                <td>
                  <strong>{dataset.source_name || dataset.id}</strong>
                  <span>{dataset.id}</span>
                </td>
                <td>{dataset.source_institution}</td>
                <td>{formatCatalogText(dataset.evidence_family)}</td>
                <td>
                  <StatusBadge
                    value={dataset.collection_status}
                    tone="neutral"
                  />
                </td>
                <td>
                  <StatusBadge
                    value={dataset.promotion_status}
                    tone={
                      dataset.promotion_status === "promoted"
                        ? "available"
                        : "pending"
                    }
                  />
                </td>
                <td>
                  <span>{formatCatalogText(dataset.spatial_coverage)}</span>
                  <small>{formatCatalogText(dataset.temporal_coverage)}</small>
                </td>
                <td>{formatCatalogText(dataset.license) || "Não informado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sourcesModalOpen ? (
        <SourceCitationModal
          datasets={sortedDatasets}
          totalDatasets={datasets.length}
          onClose={() => setSourcesModalOpen(false)}
        />
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="catalog-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SortIcon({
  active,
  direction
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <ArrowUpDown size={15} aria-hidden="true" />;
  }

  return direction === "asc" ? (
    <ArrowUp size={15} aria-hidden="true" />
  ) : (
    <ArrowDown size={15} aria-hidden="true" />
  );
}

function SourceCitationModal({
  datasets,
  totalDatasets,
  onClose
}: {
  datasets: CatalogDataset[];
  totalDatasets: number;
  onClose: () => void;
}) {
  return (
    <div
      className="source-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="source-modal-title"
        aria-modal="true"
        className="source-modal"
        role="dialog"
      >
        <header className="source-modal__header">
          <div>
            <p className="eyebrow">Citações</p>
            <h2 id="source-modal-title">Fontes documentadas</h2>
            <span>
              {datasets.length === totalDatasets
                ? `${datasets.length} fontes no catálogo`
                : `${datasets.length} fontes na seleção atual de ${totalDatasets}`}
            </span>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Fechar fontes"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {datasets.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma fonte na seleção atual</strong>
            <span>Remova filtros para ver as citações do catálogo.</span>
          </div>
        ) : (
          <ol className="source-citation-list">
            {datasets.map((dataset) => (
              <li key={dataset.id}>
                <article>
                  <p>
                    <strong>
                      {dataset.source_institution || "Instituição não informada"}
                    </strong>
                    . {dataset.source_name || dataset.id}.{" "}
                    {formatCatalogText(dataset.spatial_coverage) ||
                      "Cobertura não informada"}
                    ,{" "}
                    {formatCatalogText(dataset.temporal_coverage) ||
                      "temporalidade não informada"}
                    .
                  </p>
                  <dl>
                    <div>
                      <dt>Registro</dt>
                      <dd>{dataset.id}</dd>
                    </div>
                    <div>
                      <dt>Família</dt>
                      <dd>{formatCatalogText(dataset.evidence_family)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        {formatStatusLabel(dataset.collection_status)} ·{" "}
                        {formatStatusLabel(dataset.promotion_status)}
                      </dd>
                    </div>
                    <div>
                      <dt>Licença</dt>
                      <dd>
                        {formatCatalogText(dataset.license) || "Não informado"}
                      </dd>
                    </div>
                    <div><dt>Limitações</dt><dd>{dataset.known_limitations || "Consultar documentação da fonte."}</dd></div>
                    <div><dt>Decisão de curadoria</dt><dd>{dataset.notes}</dd></div>
                    {dataset.source_url ? (
                      <div>
                        <dt>URL</dt>
                        <dd>
                          <a
                            href={dataset.source_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {dataset.source_url}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function uniqueStatuses(statuses: string[]) {
  return [...new Set(statuses.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    formatCatalogText(a).localeCompare(formatCatalogText(b), "pt-BR")
  );
}

function sortCatalogDatasets(
  datasets: CatalogDataset[],
  sortDescriptor: SortDescriptor
) {
  return datasets
    .map((dataset, index) => ({ dataset, index }))
    .sort((a, b) => {
      const comparison = getSortValue(a.dataset, sortDescriptor.key).localeCompare(
        getSortValue(b.dataset, sortDescriptor.key),
        "pt-BR",
        {
          numeric: true,
          sensitivity: "base"
        }
      );

      if (comparison !== 0) {
        return sortDescriptor.direction === "asc" ? comparison : -comparison;
      }

      return a.index - b.index;
    })
    .map(({ dataset }) => dataset);
}

function getSortValue(dataset: CatalogDataset, key: SortKey) {
  if (key === "collection_status" || key === "promotion_status") {
    return formatStatusLabel(dataset[key]);
  }

  return formatCatalogText(dataset[key] ?? "");
}

function getAriaSort(key: SortKey, sortDescriptor: SortDescriptor) {
  if (key !== sortDescriptor.key) {
    return undefined;
  }

  return sortDescriptor.direction === "asc" ? "ascending" : "descending";
}

function getSourceGroup(dataset: CatalogDataset) {
  const haystack = [
    dataset.id,
    dataset.source_name,
    dataset.source_institution
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("prefeitura de são joão de meriti")) return "Prefeitura de São João de Meriti";

  if (
    haystack.includes("prefeitura") ||
    haystack.includes("data-rio") ||
    haystack.includes("data.rio") ||
    haystack.includes("instituto pereira passos") ||
    haystack.includes("georio") ||
    haystack.includes("rio-aguas")
  ) {
    return "Prefeitura do Rio";
  }

  if (haystack.includes("ibge")) {
    return "IBGE";
  }

  if (haystack.includes("mapbiomas")) {
    return "MapBiomas";
  }

  if (haystack.includes("sgb") || haystack.includes("cprm")) {
    return "SGB/CPRM";
  }

  if (haystack.includes("ana") || haystack.includes("snirh")) {
    return "ANA/SNIRH";
  }

  if (
    haystack.includes("snis") ||
    haystack.includes("sinisa") ||
    haystack.includes("ministerio das cidades")
  ) {
    return "SNIS/SINISA";
  }

  if (haystack.includes("inea") || haystack.includes("ceperj")) {
    return "INEA/CEPERJ";
  }

  if (haystack.includes("openstreetmap") || haystack.includes("osm")) {
    return "OpenStreetMap";
  }

  if (haystack.includes("cemaden")) return "Cemaden";

  if (
    haystack.includes("cem") ||
    haystack.includes("usp") ||
    haystack.includes("academic")
  ) {
    return "Acadêmicas";
  }

  return dataset.source_institution || "Sem instituição";
}

const CATALOG_TEXT_LABELS: Record<string, string> = {
  "Administrative boundaries and territorial reference layers":
    "Limites administrativos e camadas de referência territorial",
  "Flooding, inundation, and urban water risk":
    "Alagamentos, inundação e risco hídrico urbano",
  "Impervious surface and land use": "Superfície impermeável e uso do solo",
  "Public facilities, public land, and intervention opportunity spaces":
    "Equipamentos públicos, terras públicas e espaços de oportunidade",
  "Sanitation and drainage": "Saneamento e drenagem",
  "Supporting context": "Contexto de apoio",
  "Temporal evidence": "Evidência temporal",
  "Vegetation cover and green infrastructure":
    "Cobertura vegetal e infraestrutura verde",
  "Vulnerability, demographics, and social conditions":
    "Vulnerabilidade, demografia e condições sociais",
  "Brasil and subnational": "Brasil e recortes subnacionais",
  "Brasil with municipal products": "Brasil com produtos municipais",
  "Brasil with municipal records": "Brasil com registros municipais",
  "Estado do Rio de Janeiro": "Estado do Rio de Janeiro",
  "Municipio do Rio de Janeiro": "Município do Rio de Janeiro",
  "National with station filtering": "Nacional com filtro por estação",
  "Regiao Metropolitana do Rio de Janeiro": "Região Metropolitana do Rio de Janeiro",
  "1995 onward for water/sewage; other components vary":
    "Desde 1995 para água/esgoto; outros componentes variam",
  "2024 onward": "A partir de 2024",
  "annual series / verify selected years":
    "Série anual / verificar anos selecionados",
  "current active station snapshot": "Retrato atual de estações ativas",
  "current catalog snapshot": "Retrato atual do catálogo",
  "current OSM state at extraction time": "Estado atual do OSM no momento da extração",
  "current portal catalog": "Catálogo atual do portal",
  "current portal snapshot": "Retrato atual do portal",
  "current service snapshot": "Retrato atual do serviço",
  "historical and current as available": "Histórico e atual conforme disponibilidade",
  "real-time/latest reading": "Tempo real / leitura mais recente",
  "Academic/institutional page; verify terms":
    "Página acadêmica/institucional; verificar termos",
  "Creative Commons CC-BY-SA per MapBiomas page":
    "Creative Commons CC-BY-SA conforme página do MapBiomas",
  "Federal public information page; verify data product terms":
    "Página federal de informação pública; verificar termos do produto de dados",
  "Federal public information system; verify data product terms":
    "Sistema federal de informação pública; verificar termos do produto de dados",
  "IBGE public documentation": "Documentação pública do IBGE",
  "IBGE public downloads": "Downloads públicos do IBGE",
  "Open access item in RIGeo": "Item de acesso aberto no RIGeo",
  "Open Database License (ODbL)": "Open Database License (ODbL)",
  "Public federal water information system; verify terms":
    "Sistema federal público de informações hídricas; verificar termos",
  "Public municipal portal; verify reuse terms":
    "Portal municipal público; verificar termos de reuso",
  "Public SGB portal; verify downloadable products":
    "Portal público do SGB; verificar produtos baixáveis",
  "Public SNIRH ArcGIS service; verify terms":
    "Serviço ArcGIS público do SNIRH; verificar termos",
  "Public state data infrastructure; verify per layer":
    "Infraestrutura estadual pública de dados; verificar por camada",
  "Public state environmental portal; verify per layer":
    "Portal ambiental estadual público; verificar por camada"
};

function formatCatalogText(value: string) {
  if (!value) {
    return value;
  }

  return value
    .split(";")
    .map((part) => {
      const trimmed = part.trim();
      return CATALOG_TEXT_LABELS[trimmed] ?? trimmed;
    })
    .join("; ");
}
