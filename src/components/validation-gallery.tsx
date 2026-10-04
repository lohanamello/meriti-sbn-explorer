"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { ReferenceMetadata, ValidationCell } from "@/lib/validation-cells";

const ValidationCellMap = dynamic(() => import("./validation-cell-map").then((module) => module.ValidationCellMap), {
  ssr: false, loading: () => <p>Carregando a foto detalhada…</p>
});

function formatDate(value: number) {
  const text = String(value);
  return `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`;
}

export function ValidationGallery({ cells, references }: { cells: ValidationCell[]; references: Record<string, ReferenceMetadata> }) {
  const [index, setIndex] = useState(0);
  const [showPhoto, setShowPhoto] = useState(false);
  const cell = cells[index];
  if (!cell) return <p>Não há células disponíveis para conferência.</p>;
  const sampleId = cell.properties.sample_id;
  const reference = references[sampleId];
  const imageUrl = `/meriti/validation/${sampleId}.png`;
  return <section id="conferir-celulas" className="validation-section" aria-label="Imagens das células sorteadas">
    <h2>Conferir as 400 células</h2>
    <p><strong>O objetivo é medir toda a vegetação viva:</strong> copas de árvores, arbustos, gramados e jardins. Observe a proporção da área dentro do contorno ocupada por plantas vistas de cima, sem contar duas vezes vegetação sob uma copa. Sombra ou imagem pouco nítida devem permanecer como dúvida.</p>
    <p>Os quadrados incluem áreas com e sem sinal vegetal. As previsões do modelo ficam ocultas para não influenciar sua leitura.</p>
    <div className="validation-gallery-controls">
      <button onClick={() => setIndex(index - 1)} disabled={index === 0}>Anterior</button>
      <label>Célula <select value={index} onChange={(event) => setIndex(Number(event.target.value))}>{cells.map((item, position) => <option key={item.properties.sample_id} value={position}>{item.properties.sample_id}</option>)}</select></label>
      <button onClick={() => setIndex(index + 1)} disabled={index === cells.length - 1}>Próxima</button>
    </div>
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
    <h3>Referência aberta e datada · CBERS, 02/07/2026</h3>
    <p>PAN mostra detalhe de 2 m; cores naturais e infravermelho têm resolução de 8 m. A ampliação destes painéis não acrescenta detalhe real.</p>
    <figure>
      <Image key={sampleId} className="validation-cell-image" src={imageUrl} alt={`Célula ${sampleId}, banda pancromática, cores naturais e falsa cor infravermelha`} width={768} height={286} unoptimized />
      <figcaption>INPE, CBERS-4A/WPM, 02/07/2026, CC BY 4.0. Visualização elaborada pelo projeto.</figcaption>
    </figure>
    <a href={imageUrl} download>Baixar o painel desta célula</a>
    <p>A ficha oficial continua separada. Uma fração só pode ser aceita com referência adequada, data compatível, alinhamento verificado e revisão independente, conforme o protocolo.</p>
  </section>;
}
