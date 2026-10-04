"use client";

import { useEffect, useState } from "react";
import { REVIEW_STORAGE_KEY, mergeReviews, parseReviewFile, serializeReviews, type CellReview } from "./cell-reviews";

export function useCellReviews(ids: Set<string>) {
  const [records, setRecords] = useState<Record<string, CellReview>>({});
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [storageMessage, setStorageMessage] = useState("Carregando avaliações salvas…");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
      // Hydrate browser-only storage after mount, keeping the server and first client render identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRecords(parseReviewFile(raw, ids));
      setStorageMessage("As avaliações salvas ficam somente neste navegador e dispositivo. Exporte uma cópia para guardar ou compartilhar.");
    } catch {
      setBlocked(true);
      setStorageMessage("Não foi possível ler o armazenamento local. Nenhum dado salvo foi substituído. As novas avaliações ficarão apenas nesta sessão: exporte uma cópia antes de sair.");
    }
    setReady(true);
  }, [ids]);

  function persist(next: Record<string, CellReview>) {
    setRecords(next);
    if (blocked) return;
    try {
      localStorage.setItem(REVIEW_STORAGE_KEY, serializeReviews(next));
      setStorageMessage("Progresso salvo neste navegador. Exporte uma cópia antes de trocar de dispositivo ou limpar os dados do navegador.");
    } catch {
      setStorageMessage("Não foi possível salvar neste navegador. O progresso está apenas nesta sessão: exporte uma cópia antes de sair.");
    }
  }
  return { records, ready, storageMessage,
    save: (row: CellReview) => persist({ ...records, [row.sampleId]: row }),
    importBackup: (raw: string) => persist(mergeReviews(records, parseReviewFile(raw, ids)))
  };
}
