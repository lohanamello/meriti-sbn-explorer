"use client";

import { useState } from "react";
import { REVIEW_SOURCE, COMPARISON_REVIEW_SOURCE, PRESENCE_CRITERION, type CellReview } from "@/lib/cell-reviews";

export function CellReviewForm({ sampleId, review, onSave, onNext, hasNext }: {
  sampleId: string; review?: CellReview; onSave: (review: CellReview) => void; onNext: () => void; hasNext: boolean;
}) {
  const [vegetation, setVegetation] = useState<CellReview["vegetation"] | "">(review?.vegetation ?? "");
  const [message, setMessage] = useState("");
  function save(next: boolean) {
    if (!vegetation) { setMessage("Escolha uma das três opções para salvar."); return; }
    onSave({ sampleId, vegetation, source: COMPARISON_REVIEW_SOURCE, imageDate: null, status: "draft", criterion: PRESENCE_CRITERION, updatedAt: new Date().toISOString() });
    if (next) onNext();
  }
  return <section className="cell-review-form" aria-label={`Avaliar ${sampleId}`}>
    <h3>Sua avaliação · {sampleId}</h3>
    {review?.source === REVIEW_SOURCE && <p>Avaliação anterior feita com CBERS. Ao salvar novamente, você registra uma revisão usando Esri + CBERS.</p>}
    <fieldset><legend>Você identifica vegetação dentro do contorno?</legend>
      {([["present", "Confere"], ["absent", "Não confere"], ["unsure", "Não consigo classificar"]] as const).map(([value, label]) =>
        <label key={value}><input type="radio" name={`vegetation-${sampleId}`} value={value} checked={vegetation === value} onChange={() => { setVegetation(value); setMessage(""); }} />{label}</label>)}
    </fieldset>
    <p><strong>Confere:</strong> há plantas identificáveis, mesmo em uma parte pequena. <strong>Não confere:</strong> vejo a célula inteira e não há plantas. Terra, brita, trilhos e água sem plantas não contam como vegetação. Se não der para distinguir, escolha “Não consigo classificar”.</p>
    <div className="validation-gallery-controls"><button type="button" onClick={() => save(false)}>Salvar avaliação</button><button type="button" disabled={!hasNext} onClick={() => save(true)}>Salvar e próxima</button></div>
    <p role="status">{message}</p>
  </section>;
}
