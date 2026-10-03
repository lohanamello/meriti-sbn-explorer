import Link from "next/link";
import { getPhase3ExplorerData } from "@/lib/phase3-app-data";

export default async function NeighborhoodsPage() {
  const { neighborhoodReference: reference } = await getPhase3ExplorerData();
  return <main className="validation-page">
    <header className="validation-header"><Link className="icon-link" href="/">Voltar ao mapa</Link><p className="eyebrow">Conferência territorial</p><h1>Os bairros além do Censo</h1>
      <p>A página A Cidade da Prefeitura cita 21 bairros e centros comerciais. Quinze têm correspondência entre os 16 bairros do IBGE usados nos indicadores. Seis nomes precisavam de uma referência própria no mapa.</p></header>
    <section className="validation-section"><h2>O que foi acrescentado</h2>
      <p>Parque Alian, Parque Analândia, Parque Novo Rio, Parque Tietê e Vila Norma receberam contornos aproximados, digitalizados do atlas escolar DAGEOP/UERJ. Vila São João recebeu um ponto aproximado na posição do nome, porque o atlas não desenha uma divisa para essa localidade.</p>
      <p className="validation-pending">Os traços do atlas servem para orientação. Não certificam limites administrativos atuais nem terrenos. O mapa não informa a data da sua base e sua digitalização não foi aferida em campo.</p>
      <p>Busque esses nomes em Bairros, no mapa. Ao selecioná-los, o cartão mostra a origem do contorno ou ponto. Para consultar estatísticas, escolha explicitamente o bairro do IBGE indicado no cartão.</p>
    </section>
    <section className="validation-section"><h2>Comparação com a Prefeitura</h2><p>A lista da página A Cidade é descritiva, não exaustiva. Excluímos Shopping Grande Rio por ser um empreendimento. São Mateus corresponde à grafia São Matheus da base IBGE. Jardim Paraíso consta no IBGE e no atlas, embora não seja citado nessa página municipal.</p>
      <div className="neighborhood-table"><table className="temporal-table"><caption>Conferência dos 21 nomes citados na página municipal</caption><thead><tr><th>Nome na Prefeitura</th><th>Referência disponível no mapa</th></tr></thead><tbody>
        {reference.comparison.map((row) => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.ibgeId ? `${row.ibgeName} · IBGE 2022` : row.name === "Vila São João" ? "Atlas · ponto aproximado, sem divisa" : "Atlas · contorno aproximado"}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="validation-section"><h2>Como usar os limites</h2>
      <p>{reference.limitation}</p>
      <p>A digitalização usa as coordenadas impressas no mapa e preserva a separação entre a cartografia do atlas e a malha do Censo. As interseções com bairros IBGE orientam a navegação e não constituem uma hierarquia oficial. Não repartimos população, saneamento ou vegetação por proporção de área.</p>
      <p>Os setores censitários continuam disponíveis para investigar variações dentro dos bairros. A resolução dos dados de satélite é a mesma ao mudar a divisão territorial.</p>
      <p>A Prefeitura também usa listas mais extensas de localidades nos serviços de assistência social e no painel da Covid. Elas não formam, por si só, uma malha de divisas. A comparação acima se refere especificamente à página A Cidade.</p>
      <nav><a href={reference.municipalListUrl}>Lista da Prefeitura</a><a href={reference.sourceUrl}>Mapa original DAGEOP/UERJ</a><a href="/api/bairros/metodologia" download>Metodologia detalhada</a><a href="/meriti/evidence/layers/local-neighborhoods.geojson" download>Baixar contornos e ponto em GeoJSON</a></nav>
    </section>
  </main>;
}
