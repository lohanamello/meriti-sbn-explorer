type StatusTone = "mock" | "pending" | "available" | "unavailable" | "neutral";

const STATUS_LABELS: Record<string, string> = {
  mock: "Demonstração",
  pending: "Pendente",
  available: "Disponível",
  unavailable: "Indisponível",
  processed: "Processado",
  scored: "Pontuado",
  downloaded: "Baixado",
  candidate: "Candidato",
  deferred: "Diferido",
  promoted: "Promovido",
  rejected: "Rejeitado",
  not_reviewed: "Não revisado"
};

export function StatusBadge({
  value,
  tone = "neutral"
}: {
  value: string;
  tone?: StatusTone;
}) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {formatStatusLabel(value)}
    </span>
  );
}

export function formatStatusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}
