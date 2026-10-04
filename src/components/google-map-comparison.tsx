"use client";

import { googleSatelliteUrl, googleStreetViewUrl, type MapViewpoint } from "@/lib/google-maps-links";

export function GoogleMapComparison({ view, cell = false, onToggle }: {
  view: MapViewpoint | null; cell?: boolean; onToggle?: (open: boolean) => void;
}) {
  return <details className="google-comparison" onToggle={(event) => onToggle?.(event.currentTarget.open)}>
    <summary>{cell ? "Ver esta célula no Google Maps" : "Comparar com Google Maps"}</summary>
    <div className="google-comparison__content">
      {view ? <>
        <div className="google-comparison__links">
          <a href={googleSatelliteUrl(view)} target="_blank" rel="noopener noreferrer">Abrir no Google · Satélite ↗</a>
          <a href={googleStreetViewUrl(view)} target="_blank" rel="noopener noreferrer">Ver a rua · Street View ↗</a>
        </div>
        <p>{cell ? "Abre o centro desta célula; o contorno magenta não aparece no Google." : "Abre o centro da cruz em outra aba. Após mover este mapa, clique novamente para comparar."}</p>
        <p>Coloque as janelas lado a lado. A aba do Google não acompanha o arrasto automaticamente.</p>
        <small>{cell ? "Consulta complementar: a ficha acima continua vinculada ao CBERS de julho. " : ""}A nitidez e a data podem variar. Street View abre uma foto próxima, quando disponível; não mostra tudo que existe dentro dos terrenos.</small>
      </> : <p>Carregando a posição do mapa…</p>}
    </div>
  </details>;
}
