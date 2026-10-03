import type { VegetationResearch as ResearchData } from "@/types/phase3";
import Link from "next/link";
import { InfoTip } from "./info-tip";

function percent(value: number | null | undefined) {
  return value == null ? "sem dados" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

export function VegetationResearch({ data, territoryId }: { data: ResearchData; territoryId?: string }) {
  const canopy = territoryId ? data.canopy.observations[territoryId] : undefined;
  const seasonal = territoryId ? data.seasonality.observations[territoryId] : undefined;
  const urbanOverlap = canopy?.mapBiomas2019Comparison.byMapBiomasClass.urban;
  const field = territoryId ? data.fieldEvidence.observations[territoryId] : undefined;
  return <section className="card-section vegetation-research" aria-label="Investigação e validação da vegetação">
    <h3>Conferir a vegetação <InfoTip label="Evidências complementares">As medidas abaixo descrevem coisas diferentes. Altura modelada de copas, recorrência de NDVI e fração real de vegetação não são intercambiáveis. Nenhuma delas foi convertida em nota ou usada como rótulo de verdade para validar a outra.</InfoTip></h3>
    <div className="research-status"><strong>Validação da fração vegetal</strong><span>Referências e piloto disponíveis</span>
      <p>{data.validation.referenceLabelsCompleted} de {data.validation.sampleCells} frações de referência aceitas. A porcentagem final e a margem de erro serão calculadas depois da conferência.</p>
      <small>Data-alvo da cobertura · {data.validation.estimandDate.split("-").reverse().join("/")}</small>
      <p><Link href="/validacao">Ver a conferência, as imagens e as pendências</Link></p>
    </div>
    {field && <div className="research-measure">
      <h4>Árvores observadas em campo <InfoTip label="Arborização do Censo 2022">{data.fieldEvidence.scope} {data.fieldEvidence.denominator} {data.fieldEvidence.validationUse} Dados ausentes ou suprimidos permanecem sem valor.</InfoTip></h4>
      <dl><div><dt>Moradores em faces de rua com árvores</dt><dd>{percent(field.residents?.withTreesPct)}</dd></div>
        <div><dt>Faces de rua com árvores</dt><dd>{percent(field.faces?.withTreesPct)}</dd></div></dl>
      <small>{field.residents?.withTrees?.toLocaleString("pt-BR") ?? "Sem dado"} de {field.residents?.surveyedTotal?.toLocaleString("pt-BR") ?? "total não publicado"} moradores no universo do entorno. Coleta de 2022–2023.</small>
      <p>O percentual descreve moradores e vias. Não mede porcentagem de área vegetal.</p>
    </div>}
    {canopy && <div className="research-measure">
      <h4>Estrutura de copas em 2019 <InfoTip label="Altura modelada de copas">CHMv2 Meta/WRI, publicado em 2026, usa imagem local de 16/09/2019. Grade próxima de 1,1 m no terreno. O modelo pode confundir edifícios e sombras com árvores e não mede vegetação rasteira. Os limiares mostram sensibilidade, não confiança estatística.</InfoTip></h4>
      <dl><div><dt>Área com altura modelada ≥ 3 m</dt><dd>{percent(canopy.modeledCanopyPct["3"])}</dd></div>
        <div><dt>Área correspondente no modelo</dt><dd>{canopy.modeledCanopyAreaHa["3"]?.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) ?? "sem dados"} ha</dd></div></dl>
      <details><summary>Comparar limiares de altura</summary><table className="temporal-table"><thead><tr><th>Altura modelada</th><th>Área válida</th></tr></thead><tbody>{data.canopy.thresholdsMeters.map((height) => <tr key={height}><th scope="row">≥ {height} m</th><td>{percent(canopy.modeledCanopyPct[String(height)])}</td></tr>)}</tbody></table></details>
      <p>{percent(urbanOverlap?.shareOfModeledCanopyPct)} da área modelada ≥ 3 m aparece na classe urbana do MapBiomas 2019. <InfoTip label="Classe urbana e árvores">Comparação no mesmo ano, com definições distintas. A classe urbana pode conter árvores. O modelo de copas também pode errar. Este cruzamento não mede erro do MapBiomas nem comprova a área real de árvores. As outras classes incluem pastagem e mosaico de usos.</InfoTip></p>
    </div>}
    {seasonal && <div className="research-measure">
      <h4>Sinal vegetal ao longo de 2025 <InfoTip label="Recorrência mensal">Uma aquisição por mês. Recorrente significa NDVI ≥ 0,4 em pelo menos 80% das datas válidas. Exige seis observações válidas e presença em todos os trimestres. O denominador são os pixels elegíveis. Não mede fração de copas, vegetação permanente ou acurácia. Menos de 95% de cobertura territorial suprime o percentual.</InfoTip></h4>
      <dl><div><dt>Sinal recorrente nas datas selecionadas</dt><dd>{percent(seasonal.recurrentSignalPct)}</dd></div><div><dt>Pixels com observações suficientes</dt><dd>{percent(seasonal.coveragePct)}</dd></div></dl>
      <small>{data.seasonality.sceneCount} aquisições · janeiro a dezembro</small>
    </div>}
    <details className="validation-downloads"><summary>Material para conferência independente</summary>
      <p>Interprete a célula inteira, registre a data e a fonte, e marque dúvidas. A amostra inclui locais sem sinal vegetal para medir omissões.</p>
      <a href="/api/validacao/ficha" download>Ficha de interpretação, CSV</a>
      <a href="/api/validacao/celulas" download>400 células para SIG, GeoJSON</a>
      <a href="/api/validacao/protocolo" download>Protocolo e cálculo da incerteza</a>
      <p>A imagem CBERS de 26/04/2026 ajuda na inspeção. Para representar a cobertura de 01/10/2026, exige avaliação documentada de estabilidade temporal e alinhamento.</p>
    </details>
  </section>;
}
