"use client";

import Link from "next/link";
import { CalendarClock, Database, Layers, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { isMapOverlayLayer } from "@/lib/evidence";
import type { CatalogStats, InterpretationLens, Phase3ExplorerData, TerritorialUnitType } from "@/types/phase3";
import { MapWorkspace } from "./map-workspace";
import { OpportunityCard } from "./opportunity-card";
import { InfoTip } from "./info-tip";
import { LocalityCard } from "./locality-card";
import "./explorer-review.css";

const GRANULARITIES: Array<{ label: string; value: TerritorialUnitType }> = [
  { label: "Município", value: "municipality" },
  { label: "Distritos", value: "district" },
  { label: "Bairros", value: "neighborhood" },
  { label: "Setores", value: "census_sector" }
];

export function ExplorerShell({ catalogStats, phase3Data }: { catalogStats: CatalogStats; phase3Data: Phase3ExplorerData }) {
  const [granularity, setGranularity] = useState(phase3Data.primaryTerritorialUnit);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [viewportUnitId, setViewportUnitId] = useState(phase3Data.studyArea.code);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedLocalityId, setSelectedLocalityId] = useState<string | null>(null);
  const [activeOverlayIds, setActiveOverlayIds] = useState<string[]>(() => {
    return phase3Data.evidenceLayers.filter((layer) => layer.defaultVisible && isMapOverlayLayer(layer)).map((layer) => layer.id);
  });
  const [lens, setLens] = useState<InterpretationLens>("science");
  const [year, setYear] = useState(phase3Data.temporalEvidence.defaultYear);

  const visibleUnits = useMemo(() => phase3Data.territorialUnits
    .filter((unit) => unit.unitType === granularity)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [granularity, phase3Data.territorialUnits]);
  const listedUnits = useMemo(() => {
    const search = normalize(query);
    return visibleUnits.filter((unit) => normalize([unit.name, unit.neighborhoodName, unit.districtNames, ...phase3Data.neighborhoodReference.comparison.filter((row) => row.ibgeId === unit.id).map((row) => row.name)].join(" ")).includes(search));
  }, [visibleUnits, query, phase3Data.neighborhoodReference]);
  const reference = phase3Data.neighborhoodReference;
  const selectedLocality = reference.localities.find((locality) => locality.id === selectedLocalityId);
  const listedLocalities = granularity === "neighborhood" ? reference.localities.filter((locality) => normalize(locality.name).includes(normalize(query))) : [];
  const selectedUnit = visibleUnits.find((unit) => unit.id === selectedUnitId) ?? visibleUnits[0];
  const activeLayers = useMemo(() => phase3Data.evidenceLayers.filter((layer) => activeOverlayIds.includes(layer.id)), [phase3Data.evidenceLayers, activeOverlayIds]);
  const groups = useMemo(() => {
    const result = new Map<string, Phase3ExplorerData["evidenceLayers"]>();
    phase3Data.evidenceLayers.forEach((layer) => result.set(layer.family, [...(result.get(layer.family) ?? []), layer]));
    return result;
  }, [phase3Data.evidenceLayers]);
  const viewportUnit = phase3Data.territorialUnits.find((unit) => unit.id === viewportUnitId);

  function selectUnit(id: string) {
    setSelectedLocalityId(null);
    setSelectedUnitId(id);
    setViewportUnitId(id);
    setSelectionRevision((value) => value + 1);
  }

  function selectLocality(id: string) {
    setGranularity("neighborhood");
    setSelectedLocalityId(id);
    setActiveOverlayIds((ids) => ids.includes("local-neighborhoods") ? ids : [...ids, "local-neighborhoods"]);
    setSelectionRevision((value) => value + 1);
  }

  function changeGranularity(value: TerritorialUnitType) {
    setSelectedLocalityId(null);
    setGranularity(value);
    setQuery("");
    setSelectedUnitId("");
    setViewportUnitId(phase3Data.studyArea.code);
    setSelectionRevision((revision) => revision + 1);
  }

  function changeYear(value: number) {
    setYear(value);
    setActiveOverlayIds((ids) => ids.includes("vegetation") ? ids : [...ids, "vegetation"]);
  }

  return (
    <main className="workspace-shell ui-review">
      <header className="workspace-topbar">
        <div className="workspace-brand">
          <div className="workspace-brand__mark" aria-hidden="true">SJM</div>
          <div>
            <p className="eyebrow">São João de Meriti · Soluções baseadas na natureza</p>
            <h1>Atlas ambiental de Meriti</h1>
          </div>
        </div>
        <div className="workspace-topbar__actions">
          <Link className="icon-link" href="/bairros">Bairros</Link>
          <Link className="icon-link" href="/validacao">Validação</Link>
          <Link className="icon-link" href="/catalogo"><Database size={18} aria-hidden="true" /><span>Catálogo</span></Link>
        </div>
      </header>
      <div className="data-notice" role="status">
        <strong>16 bairros IBGE + 6 referências locais · 809 setores censitários</strong>
        <span>Sentinel-2 de 2026 · áreas protegidas · rios e canais oficiais</span>
        <InfoTip label="Datas das evidências">Cada camada mantém a data da própria fonte. A série MapBiomas de 2019 a 2023 é independente da medição Sentinel-2 de 2026. A carta de inundação é de 2015, a hidrografia BC25 é da edição 2018 e o Censo é de 2022.</InfoTip>
      </div>
      <nav className="exploration-toolbar" aria-label="Visualizações rápidas">
        <span className="exploration-toolbar__label">Explorar</span>
        {[
          { label: "Foto detalhada", ids: [] },
          { label: "Vegetação recente", ids: ["vegetation-recent", "protected-areas", "rivers-official"] },
          { label: "Imagem CBERS", ids: ["cbers-reference", "protected-areas"] },
          { label: "Copas em 2019", ids: ["canopy-height", "protected-areas"] },
          { label: "Vegetação em 2025", ids: ["vegetation-recurrence", "protected-areas"] },
          { label: "Rios e inundação", ids: ["rivers-official", "water-bodies", "flood-susceptibility"] },
          { label: "Densidade", ids: ["population", "rivers-official"] }
        ].map((view) => <button type="button" key={view.label}
          aria-pressed={activeOverlayIds.length === view.ids.length && view.ids.every((id) => activeOverlayIds.includes(id))}
          onClick={() => setActiveOverlayIds(view.ids)}>{view.label}</button>)}
        <span className="exploration-toolbar__count">{activeLayers.length} camadas ativas</span>
        <button type="button" className="exploration-toolbar__clear" onClick={() => setActiveOverlayIds([])}>Limpar</button>
      </nav>
      <section className="workspace-grid">
        <aside className="control-panel" aria-label="Controles do mapa">
          <section className="panel-section">
            <div className="panel-section__header"><MapPin size={18} aria-hidden="true" /><h2>Recorte territorial</h2></div>
            <p className="territory-code">Limites oficiais · IBGE 3305109</p>
            <button className="quick-focus" type="button" onClick={() => {
              setSelectedLocalityId(null);
              setViewportUnitId(phase3Data.studyArea.code);
              setSelectionRevision((revision) => revision + 1);
            }}>Ver município inteiro</button>
          </section>
          <section className="panel-section">
            <div className="panel-section__header"><MapPin size={18} aria-hidden="true" /><h2>Detalhamento territorial</h2><InfoTip label="Divisões territoriais">Bairros e distritos são divisões distintas. Alguns bairros atravessam mais de um distrito. Os indicadores foram agregados diretamente dos setores do Censo 2022. Seis nomes adicionais da Prefeitura têm referências no atlas escolar, com contornos ou ponto aproximados e sem indicadores próprios.</InfoTip></div>
            <div className="segmented-control segmented-control--stack">
              {GRANULARITIES.map((option) => <button key={option.value} type="button" aria-pressed={granularity === option.value}
                onClick={() => changeGranularity(option.value)}>{option.label}</button>)}
            </div>
            <label className="territory-search">Buscar território
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, bairro ou código do setor" />
            </label>
            <small>{listedUnits.length} de {visibleUnits.length} unidades IBGE{granularity === "neighborhood" ? ` · ${listedLocalities.length} de ${reference.localities.length} referências locais` : ""}</small>
            <div className="unit-list" aria-label="Unidades territoriais">
              {listedUnits.map((unit) => <button key={unit.id} type="button" aria-pressed={!selectedLocality && selectedUnit?.id === unit.id} onClick={() => selectUnit(unit.id)}>
                <span><strong>{unit.name}</strong><small>{unit.neighborhoodName ?? unit.districtNames}</small></span>
              </button>)}
              {listedLocalities.map((locality) => <button key={locality.id} type="button" aria-pressed={selectedLocalityId === locality.id} onClick={() => selectLocality(locality.id)}>
                <span><strong>{locality.name}</strong><small>{locality.geometryStatus === "approximate_boundary" ? "Atlas · contorno aproximado" : "Atlas · ponto sem divisa"}</small></span>
              </button>)}
              {listedUnits.length + listedLocalities.length === 0 && <p>Nenhum território corresponde à busca.</p>}
            </div>
            <Link className="text-link" href="/bairros">Conferir bairros da Prefeitura</Link>
          </section>
          <section className="panel-section">
            <div className="panel-section__header"><Layers size={18} aria-hidden="true" /><h2>Camadas de evidência</h2></div>
            <div className="overlay-groups">
              {[...groups].map(([family, layers]) => <div className="overlay-group" key={family}><h3>{family}</h3>
                {layers.map((layer) => <div className="overlay-row" key={layer.id}>
                  <label className="overlay-row__toggle">
                  <input type="checkbox" checked={activeOverlayIds.includes(layer.id)} disabled={!isMapOverlayLayer(layer)}
                    onChange={() => setActiveOverlayIds((ids) => ids.includes(layer.id) ? ids.filter((id) => id !== layer.id) : [...ids, layer.id])} />
                  <span className="overlay-row__main"><span>{layer.label}</span><small>{layer.resolution} · {layer.timelineReady ? year : layer.temporalCoverage}</small></span>
                  </label>
                  <InfoTip label={layer.label}>{layer.limitation}<br /><br />Fonte e período, {layer.temporalCoverage}.</InfoTip>
                </div>)}
              </div>)}
            </div>
          </section>
          <section className="panel-section">
            <div className="panel-section__header"><CalendarClock size={18} aria-hidden="true" /><h2>Série histórica MapBiomas</h2><InfoTip label="Comparação entre anos">{phase3Data.temporalEvidence.limitation} A análise Sentinel-2 de 2026 permanece independente.</InfoTip></div>
            <label className="territory-search">Ano da cobertura vegetal
              <select value={year} onChange={(event) => changeYear(Number(event.target.value))}>
                {phase3Data.temporalEvidence.years.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </section>
        </aside>
        <MapWorkspace activeLayers={activeLayers} studyArea={phase3Data.studyArea} year={year}
          selectionRevision={selectionRevision} selectedUnitId={selectedLocality ? "" : selectedUnit?.id ?? ""} units={visibleUnits}
          viewportUnit={viewportUnit} onSelectUnit={selectUnit} focusedLocality={selectedLocality} onSelectLocality={granularity === "neighborhood" ? selectLocality : undefined} />
        {selectedLocality ? <LocalityCard locality={selectedLocality} reference={reference} onSelectIbge={(id) => { setQuery(""); selectUnit(id); }} /> : <OpportunityCard activeLayers={activeLayers} catalogStats={catalogStats} lens={lens} phase3Data={phase3Data}
          selectedUnit={selectedUnit} summary={selectedUnit ? phase3Data.opportunitySummaries[selectedUnit.id] : undefined}
          year={year} onLensChange={setLens} />}
      </section>
    </main>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}
