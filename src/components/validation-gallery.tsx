"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { CellReviewForm } from "./cell-review-form";
import { useCellReviews } from "@/lib/use-cell-reviews";
import { serializeReviews } from "@/lib/cell-reviews";
import type { ReferenceMetadata, ValidationCell } from "@/lib/validation-cells";

const ValidationCellMap = dynamic(() => import("./validation-cell-map").then((module) => module.ValidationCellMap), {
  ssr: false, loading: () => <p>Carregando a foto detalhada…</p>
});

function formatDate(value: number) {
  const text = String(value);
  return `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`;
}

export function ValidationGallery({ cells, references }: { cells: ValidationCell[]; references: Record<string, ReferenceMetadata> }) {
  const imageRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [showPhoto, setShowPhoto] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const ids = useMemo(() => new Set(cells.map((item) => item.properties.sample_id)), [cells]);
  const { records, ready, storageMessage, save, importBackup } = useCellReviews(ids);
  const [dirty, setDirty] = useState(false);
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
  return <section id="conferir-celulas" className="validation-section" aria-label="Imagens das células sorteadas">
    <h2>Conferir as 400 células</h2>
    <p><strong>O objetivo é medir toda a vegetação viva:</strong> copas de árvores, arbustos, gramados e jardins. Nesta revisão, indique apenas se identifica vegetação dentro do contorno. Sombra ou imagem pouco nítida devem permanecer como dúvida.</p>
    <p>Os quadrados incluem áreas com e sem sinal vegetal. As previsões do modelo ficam ocultas para não influenciar sua leitura.</p>
    <div className="validation-gallery-controls">
      <button onClick={() => navigate(index - 1)} disabled={index === 0}>Anterior</button>
      <label>Célula <select value={index} onChange={(event) => navigate(Number(event.target.value))}>{cells.map((item, position) => <option key={item.properties.sample_id} value={position}>{item.properties.sample_id}</option>)}</select></label>
      <button onClick={() => navigate(index + 1)} disabled={index === cells.length - 1}>Próxima</button>
    </div>
    <h3>Referência aberta e datada · CBERS, 02/07/2026</h3>
    <p>PAN mostra detalhe de 2 m; cores naturais e infravermelho têm resolução de 8 m. A ampliação destes painéis não acrescenta detalhe real.</p>
    <figure ref={imageRef}>
      <Image key={sampleId} className="validation-cell-image" src={imageUrl} alt={`Célula ${sampleId}, banda pancromática, cores naturais e falsa cor infravermelha`} width={768} height={286} unoptimized />
      <figcaption>INPE, CBERS-4A/WPM, 02/07/2026, CC BY 4.0. Visualização elaborada pelo projeto.</figcaption>
    </figure>
    <a href={imageUrl} download>Baixar o painel desta célula</a>
    {ready && <div onChangeCapture={() => setDirty(true)}><CellReviewForm key={`${sampleId}-${records[sampleId]?.updatedAt ?? "new"}`} sampleId={sampleId} review={records[sampleId]} hasNext={index < cells.length - 1} onSave={(row) => { save(row); setDirty(false); }} onNext={() => { setIndex(index + 1); imageRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }} /></div>}
    <div className="review-progress">
      <strong>{Object.keys(records).length} de {cells.length} células com avaliação salva</strong>
      <p>{Object.values(records).filter((row) => row.vegetation === "present").length} confere · {Object.values(records).filter((row) => row.vegetation === "absent").length} não confere · {Object.values(records).filter((row) => row.vegetation === "unsure").length} não consigo classificar.</p>
      <p role="status">{storageMessage}</p>
      <p>Comece com 10 a 20 células para testar a leitura. Estes registros são rascunhos de interpretação da imagem de julho; não aprovam a estimativa de outubro nem atualizam o mapa automaticamente.</p>
      <div className="validation-gallery-controls">
        <button type="button" disabled={!ready || !Object.keys(records).length} onClick={exportBackup}>Exportar avaliações salvas</button>
        <label className="review-import">Importar cópia de avaliações<input type="file" accept=".json,application/json" disabled={!ready} onChange={async (event) => {
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
        <button type="button" disabled={!ready || cells.every((item) => records[item.properties.sample_id])} onClick={() => navigate(cells.findIndex((item) => !records[item.properties.sample_id]))}>Ir para uma célula sem avaliação</button>
      </div>
      <p role="status">{backupMessage}</p>
    </div>
    <p>A ficha oficial e as frações validadas continuam separadas. Depois da revisão, os rascunhos podem apoiar a análise de erros. O número de avaliações salvas não é o número de células cientificamente validadas.</p>
    <details className="review-optional-reference"><summary>Consulta opcional: localizar a célula na foto Esri</summary>
    <h3>Localizar a célula na foto detalhada</h3>
    <p>A foto Esri permite examinar o contexto com mais detalhe. O contorno magenta mostra a célula sorteada, não uma detecção de vegetação. Você pode ocultá-lo, aproximar a imagem e abrir em tela cheia.</p>
    <button className="text-link" type="button" aria-expanded={showPhoto} onClick={() => setShowPhoto(!showPhoto)}>{showPhoto ? "Fechar foto detalhada" : "Abrir foto detalhada da célula"}</button>
    {showPhoto && <>
      <ValidationCellMap cell={cell} />
      <p className="validation-reference-date"><strong>Metadados consultados em 03/10/2026 para esta célula:</strong> {reference?.dates.length ? reference.dates.map(formatDate).join(" e ") : "data não identificada"}; resolução de origem {reference?.resolutions.length ? reference.resolutions.map((value) => `${value.toLocaleString("pt-BR")} m`).join(" e ") : "não identificada"}.
        {reference && reference.dates.length > 1 && " A célula cruza duas áreas de imagem: não atribua uma data única."}
        {" "}O mosaico online pode mudar. Esses metadados históricos não confirmam automaticamente a data da imagem exibida hoje.</p>
      <p>A imagem serve à consulta visual. Uma foto de 2025 não comprova a cobertura em 01/10/2026. O alinhamento também precisa ser conferido: detalhe fino não garante a posição exata do contorno. Não há extração automática de copas nem aceitação de rótulos nesta visualização.</p>
    </>}
    <p>A avaliação acima é registrada exclusivamente para o painel CBERS. Não misture uma observação desta foto com a data de julho de 2026.</p>
    </details>
  </section>;
}
