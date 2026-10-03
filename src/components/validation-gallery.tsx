"use client";

import Image from "next/image";
import { useState } from "react";

export function ValidationGallery({ sampleIds }: { sampleIds: string[] }) {
  const [index, setIndex] = useState(0);
  const sampleId = sampleIds[index];
  const imageUrl = `/meriti/validation/${sampleId}.png`;
  return <section className="validation-section" aria-label="Imagens das células sorteadas">
    <h2>Conferir as 400 células</h2>
    <p>Imagem de 02/07/2026. O contorno magenta delimita a célula inteira. PAN mostra detalhe de 2 m; cores naturais e infravermelho têm resolução de 8 m. Ampliação não acrescenta detalhe.</p>
    <div className="validation-gallery-controls">
      <button onClick={() => setIndex(index - 1)} disabled={index === 0}>Anterior</button>
      <label>Célula <select value={index} onChange={(event) => setIndex(Number(event.target.value))}>{sampleIds.map((id, position) => <option key={id} value={position}>{id}</option>)}</select></label>
      <button onClick={() => setIndex(index + 1)} disabled={index === sampleIds.length - 1}>Próxima</button>
    </div>
    <figure>
      <Image key={sampleId} className="validation-cell-image" src={imageUrl} alt={`Célula ${sampleId}, banda pancromática, cores naturais e falsa cor infravermelha`} width={768} height={286} unoptimized />
      <figcaption>INPE, CBERS-4A/WPM, 02/07/2026, CC BY 4.0. Visualização elaborada pelo projeto.</figcaption>
    </figure>
    <a href={imageUrl} download>Baixar o painel desta célula</a>
    <p>A galeria omite os estratos e as previsões dos modelos. Registre a interpretação na ficha. Ver uma imagem não aprova automaticamente sua adequação, estabilidade temporal ou fração vegetal.</p>
  </section>;
}
