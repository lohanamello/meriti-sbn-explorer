import Link from "next/link";
import type { Locality, NeighborhoodReference } from "@/types/phase3";
import { InfoTip } from "./info-tip";

export function LocalityCard({ locality, reference, onSelectIbge }: {
  locality: Locality; reference: NeighborhoodReference; onSelectIbge: (id: string) => void;
}) {
  const isBoundary = locality.geometryStatus === "approximate_boundary";
  return <aside className="opportunity-card" aria-label="Bairro ou localidade do atlas">
    <header className="opportunity-card__header"><div><p className="eyebrow">Bairros e localidades</p><h2>{locality.name}</h2>
      <span className="unit-context">{isBoundary ? "Contorno aproximado do atlas" : "Ponto aproximado, sem limite publicado"}</span></div></header>
    <section className="card-section"><h3>Localização no mapa <InfoTip label="Precisão do bairro">{reference.limitation}</InfoTip></h3>
      <p>{isBoundary ? "O contorno tracejado foi digitalizado do atlas escolar. Ele permite localizar este bairro além das divisões do Censo." : "O atlas indica esta localidade pelo nome, sem desenhar uma divisa própria. O ponto marca a posição aproximada do rótulo."}</p>
      <p>{locality.method}</p>
      <p>Esta referência não certifica divisas atuais, terrenos ou endereços. A edição do mapa não informa uma data de referência.</p>
      <a className="text-link" href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar mapa original · DAGEOP/UERJ</a>
    </section>
    <section className="card-section"><h3>Indicadores no recorte do IBGE</h3>
      <p>Os indicadores disponíveis pertencem aos bairros do Censo 2022. Não foram atribuídos a {locality.name} nem repartidos pela área do atlas.</p>
      <p>{isBoundary ? "O contorno aproximado intersecta os seguintes bairros do IBGE. Pequenas interseções podem decorrer da diferença entre as cartografias." : "O ponto aproximado fica no seguinte bairro do IBGE. Isso não delimita a localidade."}</p>
      {locality.ibgeOverlaps.map((unit) => <button className="quick-focus" key={unit.id} type="button" onClick={() => onSelectIbge(unit.id)}>Ver indicadores de {unit.name} · IBGE</button>)}
    </section>
    <section className="card-section"><h3>Conferência dos nomes</h3><p>Este nome aparece na página A Cidade da Prefeitura e não tem um polígono próprio entre os 16 bairros usados pelo Censo.</p>
      <Link className="text-link" href="/bairros">Ver comparação completa e método</Link>
      <a className="text-link" href="/api/bairros/metodologia" download>Baixar metodologia detalhada</a>
    </section>
  </aside>;
}
