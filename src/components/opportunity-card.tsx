"use client";

import Link from "next/link";
import { BookOpen, Database, Download, FlaskConical } from "lucide-react";
import type { CatalogStats, EvidenceLayer, InterpretationLens, OpportunitySummary, Phase3ExplorerData, TerritorialUnit } from "@/types/phase3";
import { StatusBadge } from "./status-badge";
import { InfoTip } from "./info-tip";
import { VegetationResearch } from "./vegetation-research";

const UNIT_LABELS: Record<TerritorialUnit["unitType"], string> = {
  municipality: "Município", district: "Distrito", neighborhood: "Bairro", census_sector: "Setor censitário"
};

export function OpportunityCard({ activeLayers, catalogStats, lens, phase3Data, selectedUnit, summary, year, onLensChange }: {
  activeLayers: EvidenceLayer[]; catalogStats: CatalogStats; lens: InterpretationLens; phase3Data: Phase3ExplorerData;
  selectedUnit?: TerritorialUnit; summary?: OpportunitySummary; year: number; onLensChange: (lens: InterpretationLens) => void;
}) {
  const series = selectedUnit ? phase3Data.temporalEvidence.observations[selectedUnit.id] : undefined;
  const observation = series?.[String(year)];
  const recent = selectedUnit ? phase3Data.recentVegetation.observations[selectedUnit.id] : undefined;
  const recentLayer = phase3Data.evidenceLayers.find((layer) => layer.id === "vegetation-recent");

  function exportSummary() {
    if (!selectedUnit || !summary) return;
    const payload = {
      municipality: phase3Data.studyArea.name,
      territory: { id: selectedUnit.id, name: selectedUnit.name, type: selectedUnit.unitType, population2022: selectedUnit.populationTotal, areaKm2: selectedUnit.areaKm2 },
      generatedAt: phase3Data.generatedAt,
      indicators: summary.signals,
      landCoverYear: year,
      landCover: observation,
      landCoverSeries: series,
      recentVegetation: { ...phase3Data.recentVegetation, observations: undefined, territoryObservation: recent },
      vegetationResearch: {
        ...phase3Data.vegetationResearch,
        fieldEvidence: { ...phase3Data.vegetationResearch.fieldEvidence, observations: undefined, territoryObservation: selectedUnit ? phase3Data.vegetationResearch.fieldEvidence.observations[selectedUnit.id] : undefined },
        canopy: { ...phase3Data.vegetationResearch.canopy, observations: undefined, territoryObservation: selectedUnit ? phase3Data.vegetationResearch.canopy.observations[selectedUnit.id] : undefined },
        seasonality: { ...phase3Data.vegetationResearch.seasonality, observations: undefined, territoryObservation: selectedUnit ? phase3Data.vegetationResearch.seasonality.observations[selectedUnit.id] : undefined }
      },
      protectedAreas: phase3Data.protectedAreas,
      solutionsToInvestigate: summary.solutionClasses,
      methodology: phase3Data.methodology,
      sources: phase3Data.sourceReferences,
      evidence: phase3Data.evidenceLayers.map(({ id, sourceDatasetIds, temporalCoverage, limitation }) => ({ id, sourceDatasetIds, temporalCoverage, limitation }))
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `meriti-${selectedUnit.id}-indicadores.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <aside className="opportunity-card" aria-label="Cartão de oportunidade territorial">
    <header className="opportunity-card__header">
      <div><p className="eyebrow">Unidade territorial ativa</p><h2>{selectedUnit?.name ?? "Selecione um território"}</h2>
        {selectedUnit && <span className="unit-context">{UNIT_LABELS[selectedUnit.unitType]} · São João de Meriti</span>}
      </div>
      <StatusBadge value={summary?.status ?? "pending"} tone={summary ? "available" : "pending"} />
    </header>
    <dl className="card-metrics">
      <div><dt>População <InfoTip label="População">População residente do Censo 2022. Não é estimativa da população atual.</InfoTip></dt><dd>{selectedUnit?.populationTotal.toLocaleString("pt-BR") ?? "n/d"}</dd><small>Censo 2022</small></div>
      <div><dt>Área <InfoTip label="Área territorial">Área do polígono do Censo 2022, calculada em SIRGAS 2000 / UTM 23S. A densidade divide a população por esta área total.</InfoTip></dt><dd>{selectedUnit?.areaKm2.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) ?? "n/d"}</dd><small>km² · malha 2022</small></div>
      <div><dt>Vegetação <InfoTip label="Vegetação histórica">Classes selecionadas do MapBiomas, coleção 2 beta. Não contabiliza toda a arborização urbana. Esta porcentagem não pode ser comparada diretamente com os limiares NDVI da análise recente.</InfoTip></dt><dd>{formatPercent(observation?.vegetationPct)}</dd><small>MapBiomas · {year}</small></div>
    </dl>
    <div className="lens-tabs" role="tablist" aria-label="Lente de interpretação">
      <button type="button" role="tab" id="lens-science" aria-controls="lens-panel" aria-selected={lens === "science"} onClick={() => onLensChange("science")}><BookOpen size={16} aria-hidden="true" />Comunicação</button>
      <button type="button" role="tab" id="lens-technical" aria-controls="lens-panel" aria-selected={lens === "technical"} onClick={() => onLensChange("technical")}><FlaskConical size={16} aria-hidden="true" />Lente técnica</button>
    </div>
    <section className="card-section card-section--lens" role="tabpanel" id="lens-panel" aria-labelledby={lens === "technical" ? "lens-technical" : "lens-science"}>
      <h3>{lens === "technical" ? "Leitura técnica" : "Leitura pública"}</h3>
      <p>{lens === "technical" ? summary?.technicalLens : summary?.scienceCommunicationLens}</p>
    </section>
    <section className="card-section"><h3>Indicadores do território</h3>
      <ul className="signal-list">{summary?.signals.map((signal) => <li key={signal.label}><span><strong>{signal.label} <InfoTip label={signal.label}>{phase3Data.evidenceLayers.find((layer) => layer.id === signal.evidenceLayerId)?.limitation}</InfoTip></strong>{signal.value}</span></li>)}</ul>
      {selectedUnit?.unitType !== "neighborhood" && <p className="muted">Saneamento disponível por bairro <InfoTip label="Escala do saneamento">Os indicadores de saneamento estão disponíveis na escala dos bairros. Selecione Bairros para consultá-los. Células suprimidas dos setores não foram preenchidas com zero.</InfoTip></p>}
    </section>
    {recent && <section className="card-section recent-vegetation">
      <h3>Vegetação recente <InfoTip label="Sinal de vegetação recente">{recentLayer?.limitation} O limiar central de 0,4 é exploratório. A variação entre limiares mostra sensibilidade da medição, não um intervalo de confiança. Territórios com menos de 95% de pixels com observações suficientes ficam sem percentual de sinal vegetal.</InfoTip></h3>
      <p>Sentinel-2 · 05/08 a 01/10/2026 · {phase3Data.recentVegetation.sceneCount} cenas</p>
      <dl className="recent-measurement"><div><dt>Pixels com NDVI ≥ 0,4</dt><dd>{formatPercent(recent.vegetationSignalPct["0.4"])}</dd></div><div><dt>Área com observações suficientes</dt><dd>{formatPercent(recent.coveragePct)}</dd></div></dl>
      <details><summary>Sensibilidade ao limiar <InfoTip label="Limiares de NDVI">NDVI é (infravermelho próximo − vermelho) / (infravermelho próximo + vermelho), após correção radiométrica. Um limiar maior exige sinal vegetal mais intenso. Percentuais usam somente pixels com pelo menos três observações válidas.</InfoTip></summary>
        <table className="temporal-table"><thead><tr><th>Limiar</th><th>Pixels válidos acima do limiar</th></tr></thead><tbody>{phase3Data.recentVegetation.thresholds.map((threshold) => <tr key={threshold}><th scope="row">NDVI ≥ {threshold.toLocaleString("pt-BR")}</th><td>{formatPercent(recent.vegetationSignalPct[String(threshold)])}</td></tr>)}</tbody></table>
      </details>
    </section>}
    {series && <section className="card-section">
      <h3>Histórico MapBiomas <InfoTip label="Comparação histórica">A classificação não conta toda a arborização urbana. Diferenças entre anos não comprovam perda ou ganho real sem verificação independente. Não juntar os percentuais MapBiomas e NDVI em uma única série.</InfoTip></h3>
      <table className="temporal-table"><caption>Mesma coleção MapBiomas e limite territorial de 2022</caption><thead><tr><th>Ano</th><th>Área classificada</th><th>Dados válidos</th></tr></thead>
        <tbody>{phase3Data.temporalEvidence.years.map((value) => <tr key={value} aria-current={year === value ? "true" : undefined}>
          <th scope="row">{value}</th><td>{formatPercent(series[String(value)]?.vegetationPct)}</td><td>{formatPercent(series[String(value)]?.coveragePct)}</td>
        </tr>)}</tbody>
      </table>
    </section>}
    <section className="card-section"><h3>Classes de solução a investigar <InfoTip label="Viabilidade das soluções">São hipóteses para investigação. A base não comprova domínio público, capacidade de drenagem ou viabilidade de obras. Confirmar condições locais antes de escolher intervenções.</InfoTip></h3>
      <ul className="solution-list">{summary?.solutionClasses.map((solution) => <li key={solution.label}><strong>{solution.label}</strong><span>{solution.rationale}</span></li>)}</ul>
    </section>
    <VegetationResearch data={phase3Data.vegetationResearch} territoryId={selectedUnit?.id} />
    <section className="card-section source-section"><h3>Fontes e limitações</h3>
      {activeLayers.map((layer) => <p key={layer.id}><strong>{layer.label}</strong> <InfoTip label={`Fonte de ${layer.label}`}>{layer.limitation}<br /><br />Período, {layer.timelineReady ? year : layer.temporalCoverage}.</InfoTip></p>)}
      <details><summary>Notas metodológicas completas</summary><ul className="limitation-list">{phase3Data.methodology.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details>
      <a className="text-link" href="/api/metodologia" download>Baixar metodologia detalhada</a>
      <div className="catalog-mini"><span>{catalogStats.promoted} fontes promovidas</span><span>{catalogStats.deferred} fontes diferidas</span></div>
      <Link className="text-link" href="/catalogo"><Database size={16} aria-hidden="true" />Ver catálogo e fontes</Link>
      <button className="quick-focus" type="button" disabled={!summary} onClick={exportSummary}><Download size={16} aria-hidden="true" />Exportar indicadores</button>
    </section>
  </aside>;
}

function formatPercent(value: number | null | undefined) {
  return value == null ? "sem dados" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "%";
}
