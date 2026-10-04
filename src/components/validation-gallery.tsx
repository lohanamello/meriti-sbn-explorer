"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { CellReviewForm } from "./cell-review-form";
import { GoogleMapComparison } from "./google-map-comparison";
import { useCellReviews } from "@/lib/use-cell-reviews";
import { PRESENCE_CRITERION, serializeReviews } from "@/lib/cell-reviews";
import { cellBounds, type ReferenceMetadata, type ValidationCell } from "@/lib/validation-cells";

const ValidationCellMap = dynamic(() => import("./validation-cell-map").then((module) => module.ValidationCellMap), {
  ssr: false, loading: () => <p>Carregando a foto detalhada…</p>
});

function formatDate(value: number) {
  const text = String(value);
  return `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`;
}

export function ValidationGallery({ cells, references }: { cells: ValidationCell[]; references: Record<string, ReferenceMetadata> }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [backupMessage, setBackupMessage] = useState("");
  const ids = useMemo(() => new Set(cells.map((item) => item.properties.sample_id)), [cells]);
  const { records, ready, storageMessage, save, importBackup } = useCellReviews(ids);
  const [dirty, setDirty] = useState(false);
  // Freeze this round so changing an answer never removes the current cell or skips the next one.
  const [reviewQueue, setReviewQueue] = useState<number[] | null>(null);
  const [reviewKind, setReviewKind] = useState<"present" | "absent">("present");
  function pendingReviews(kind: "present" | "absent") { return cells.flatMap((item, position) => {
    const row = records[item.properties.sample_id];
    return row?.vegetation === kind && row.criterion !== PRESENCE_CRITERION ? [position] : [];
  }); }
  const pendingPositives = pendingReviews("present");
  const pendingNegatives = pendingReviews("absent");
  const reviewLabel = reviewKind === "present" ? "Conferes" : "Não confere";
  const visibleIndices = reviewQueue ?? cells.map((_, position) => position);
  const position = visibleIndices.indexOf(index);
  const previousIndex = visibleIndices[position - 1];
  const nextIndex = visibleIndices[position + 1];
  const reviewedCount = reviewQueue?.filter((i) => records[cells[i].properties.sample_id]?.criterion === PRESENCE_CRITERION).length ?? 0;
  function startReview(kind: "present" | "absent") {
    const pending = kind === "present" ? pendingPositives : pendingNegatives;
    if (!pending.length) return;
    if (dirty && !window.confirm("Há alterações não salvas. Deseja descartá-las para iniciar a revisão?")) return;
    setDirty(false);
    setReviewKind(kind);
    setReviewQueue(pending);
    setIndex(pending[0]);
  }
  function leaveReview() {
    if (dirty && !window.confirm("Há alterações não salvas. Deseja descartá-las e voltar à lista completa?")) return;
    setDirty(false);
    setReviewQueue(null);
  }
  function navigate(next: number) {
    if (dirty && !window.confirm("Há alterações não salvas nesta célula. Deseja descartá-las e mudar de célula?")) return;
    setDirty(false);
    setIndex(next);
  }
  function exportBackup() {
    const url = URL.createObjectURL(new Blob([serializeReviews(records)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `meriti-avaliacoes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMessage("Cópia exportada com as avaliações salvas. Alterações ainda não salvas no formulário não entram na cópia.");
  }
  const cell = cells[index];
  if (!cell) return <p>Não há células disponíveis para conferência.</p>;
  const sampleId = cell.properties.sample_id;
  const reference = references[sampleId];
  const imageUrl = `/meriti/validation/${sampleId}.png`;
  const bounds = cellBounds(cell);
  const cellView = { longitude: (bounds[0][0] + bounds[1][0]) / 2, latitude: (bounds[0][1] + bounds[1][1]) / 2, zoom: 20 };
  return <section id="conferir-celulas" className="validation-section" aria-label="Imagens das células sorteadas">
    <h2>Conferir as 400 células</h2>
    <p><strong>O objetivo é medir toda a vegetação viva:</strong> copas de árvores, arbustos, gramados e jardins. Nesta revisão, indique apenas se identifica vegetação dentro do contorno. Sombra ou imagem pouco nítida devem permanecer como dúvida.</p>
    <p>Os quadrados incluem áreas com e sem sinal vegetal. As previsões do modelo ficam ocultas para não influenciar sua leitura.</p>
    <div className="positive-review-panel">
      {reviewQueue ? <>
        <strong>Revisão dos seus {reviewLabel} · {reviewedCount} de {reviewQueue.length} revistos</strong>
        <p>Esta rodada mostra somente os “{reviewKind === "present" ? "Confere" : "Não confere"}” que estavam pendentes quando você começou. Ao corrigir uma resposta, a célula continua nesta lista para você poder voltar a ela.</p>
        {reviewedCount === reviewQueue.length && <p role="status">Revisão desta rodada concluída. Exporte suas avaliações para guardar uma cópia.</p>}
        <button type="button" onClick={leaveReview}>Voltar às 400 células</button>
      </> : <>
        <div className="validation-gallery-controls">
          <button type="button" disabled={!ready || !pendingPositives.length} onClick={() => startReview("present")}>Revisar meus Conferes ({pendingPositives.length} pendentes)</button>
          <button type="button" disabled={!ready || !pendingNegatives.length} onClick={() => startReview("absent")}>Revisar meus Não confere ({pendingNegatives.length} pendentes)</button>
        </div>
        <p>Escolha quais respostas antigas revisar. A resposta anterior será preservada na cópia exportada; nenhuma classificação muda até você salvar. As células já revistas pelo critério de presença não precisam ser repetidas.</p>
      </>}
      <p><strong>O critério é presença de plantas, não predominância nem drenagem.</strong> Terra ou brita sem plantas: “Não confere”. Com gramíneas ou outras plantas identificáveis: “Confere”, mesmo que sejam minoria. Imagem ambígua: “Não consigo classificar”.</p>
      {reviewQueue && reviewKind === "absent" && <p>Mesmo com mais telhado ou asfalto, se você identifica plantas dentro do contorno, marque “Confere”. Não é preciso estimar a porcentagem.</p>}
    </div>
    <div className="validation-gallery-controls">
      <button onClick={() => navigate(previousIndex)} disabled={previousIndex === undefined}>Anterior</button>
      <label>Célula <select value={index} onChange={(event) => navigate(Number(event.target.value))}>{visibleIndices.map((i) => <option key={cells[i].properties.sample_id} value={i}>{cells[i].properties.sample_id}</option>)}</select></label>
      <button onClick={() => navigate(nextIndex)} disabled={nextIndex === undefined}>Próxima</button>
    </div>
    <p>Compare o mesmo contorno magenta nas imagens abaixo. As fontes têm datas diferentes; se a leitura ou a comparação deixar dúvida, escolha “Não consigo classificar”.</p>
    <div className="validation-comparison-grid" ref={imageRef}>
      <div className="validation-comparison-photo">
        <h3>Foto de maior detalhe · Esri</h3>
        <ValidationCellMap cell={cell} />
      </div>
      <div className="validation-comparison-reference">
        <h3>Três imagens CBERS · 02/07/2026</h3>
        <p className="validation-resolution-note">PAN: 2 m · cores naturais e infravermelho: 8 m</p>
        <figure>
          <Image key={sampleId} className="validation-cell-image" src={imageUrl} alt={`Célula ${sampleId}, banda pancromática, cores naturais e falsa cor infravermelha`} width={768} height={286} unoptimized />
          <figcaption>INPE, CBERS-4A/WPM · CC BY 4.0. Visualização do projeto.</figcaption>
        </figure>
        <a href={imageUrl} download>Baixar o painel desta célula</a>
    {ready && <div onChangeCapture={() => setDirty(true)}><CellReviewForm key={`${sampleId}-${records[sampleId]?.updatedAt ?? "new"}`} sampleId={sampleId} review={records[sampleId]} hasNext={nextIndex !== undefined} onSave={(row) => { save(row); setDirty(false); }} onNext={() => { setIndex(nextIndex); imageRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }} /></div>}
      </div>
    </div>
    <div className="review-progress">
      <strong>{Object.keys(records).length} de {cells.length} células com avaliação salva</strong>
      <p>{Object.values(records).filter((row) => row.vegetation === "present").length} confere · {Object.values(records).filter((row) => row.vegetation === "absent").length} não confere · {Object.values(records).filter((row) => row.vegetation === "unsure").length} não consigo classificar.</p>
      <p role="status">{storageMessage}</p>
      <p>As novas avaliações registram a comparação visual Esri + CBERS, sem atribuir uma data única às duas fontes. Não aprovam a estimativa de outubro nem atualizam o mapa automaticamente.</p>
      <div className="validation-gallery-controls">
        <button type="button" disabled={!ready || !Object.keys(records).length} onClick={exportBackup}>Exportar avaliações salvas</button>
        <label className="review-import">Importar cópia de avaliações<input type="file" accept=".json,application/json" disabled={!ready || reviewQueue !== null} onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (dirty && !window.confirm("A importação pode substituir o formulário não salvo. Deseja continuar?")) return;
          try {
            if (file.size > 5_000_000) throw new Error("Arquivo muito grande.");
            importBackup(await file.text());
            setDirty(false);
            setBackupMessage("Cópia importada. A avaliação mais recente de cada célula foi preservada.");
          } catch { setBackupMessage("Não foi possível importar: use uma cópia válida exportada por esta ferramenta. Suas avaliações atuais foram preservadas."); }
        }} /></label>
        <button type="button" disabled={!ready || reviewQueue !== null || cells.every((item) => records[item.properties.sample_id])} onClick={() => navigate(cells.findIndex((item) => !records[item.properties.sample_id]))}>Ir para uma célula sem avaliação</button>
      </div>
      <p role="status">{backupMessage}</p>
    </div>
    <p>A ficha oficial e as frações validadas continuam separadas. Depois da revisão, os rascunhos podem apoiar a análise de erros. O número de avaliações salvas não é o número de células cientificamente validadas.</p>
    <GoogleMapComparison view={cellView} cell />
    <details className="review-optional-reference"><summary>Datas e limites da comparação</summary>
      <p className="validation-reference-date"><strong>Metadados consultados em 03/10/2026 para esta célula:</strong> {reference?.dates.length ? reference.dates.map(formatDate).join(" e ") : "data não identificada"}; resolução de origem {reference?.resolutions.length ? reference.resolutions.map((value) => `${value.toLocaleString("pt-BR")} m`).join(" e ") : "não identificada"}.
        {reference && reference.dates.length > 1 && " A célula cruza duas áreas de imagem: não atribua uma data única."}
        {" "}O mosaico online pode mudar. Esses metadados históricos não confirmam automaticamente a data da imagem exibida hoje.</p>
      <p>A imagem serve à consulta visual. Uma foto de 2025 não comprova a cobertura em 01/10/2026. O alinhamento também precisa ser conferido: detalhe fino não garante a posição exata do contorno. Não há extração automática de copas nem aceitação de rótulos nesta visualização.</p>
    <p>As avaliações antigas feitas somente com CBERS mantêm sua identificação original. As novas avaliações usam a comparação Esri + CBERS; a data do mosaico Esri atual não foi confirmada. Ampliar as imagens não cria detalhe novo.</p>
    </details>
  </section>;
}
