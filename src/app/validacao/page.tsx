import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPhase3ExplorerData } from "@/lib/phase3-app-data";
import { VegetationGuide } from "@/components/vegetation-guide";
import type { ValidationCell, ReferenceMetadata } from "@/lib/validation-cells";
import { ValidationGallery } from "@/components/validation-gallery";

export default async function ValidationPage() {
  const { vegetationResearch: research } = await getPhase3ExplorerData();
  const audit = research.referenceAudit;
  const field = research.fieldEvidence;
  const city = field.observations["3305109"];
  const cells = JSON.parse(await readFile(path.join(process.cwd(), "data/processed/meriti/validation/sample-cells-blinded.geojson"), "utf8"));
  const metadata = JSON.parse(await readFile(path.join(process.cwd(), "data/interim/meriti/independent-reference-audit/esri-cell-metadata.json"), "utf8"));
  const references: Record<string, ReferenceMetadata> = {};
  for (const entry of metadata.data as Array<{ layer: number; sampleId: string; candidates: Array<{ SRC_DATE: number; SRC_RES: number }> }>) {
    if (entry.layer !== 9) continue;
    references[entry.sampleId] = { dates: [...new Set(entry.candidates.map((item) => item.SRC_DATE))], resolutions: [...new Set(entry.candidates.map((item) => item.SRC_RES))] };
  }
  return <main className="validation-page">
    <header className="validation-header"><Link className="icon-link" href="/">Voltar ao mapa</Link><p className="eyebrow">Conferência das evidências · 03/10/2026</p><h1>Conferir a vegetação total</h1>
      <p>O objetivo é estimar a porcentagem do município coberta por toda a vegetação viva, incluindo árvores, arbustos, gramados e jardins. A conferência está abaixo; a estimativa final ainda depende de referências adequadas e revisão.</p></header>
    <VegetationGuide />
    <section className="validation-section" aria-labelledby="field-title"><h2 id="field-title">Presença histórica observada pelo IBGE</h2>
      <dl className="validation-facts"><div><dt>Setores com faces de rua que tinham árvores</dt><dd>{field.summary.sectorsWithObservedTreePresence} de {field.summary.sectorsWithPublishedFaceObservations}</dd></div>
        <div><dt>Moradores em faces com árvores</dt><dd>{city.residents?.withTrees?.toLocaleString("pt-BR")} de {city.residents?.surveyedTotal?.toLocaleString("pt-BR")}</dd></div>
        <div><dt>Faces de rua com árvores</dt><dd>{city.faces?.withTrees?.toLocaleString("pt-BR")} de {city.faces?.surveyedTotal?.toLocaleString("pt-BR")}</dd></div></dl>
      <p>Coleta de junho de 2022 a maio de 2023. Todos os 16 bairros têm registros positivos. Três setores não têm registros; um setor tem moradores e domicílios suprimidos. O denominador inclui o quesito saltado.</p>
      <p>Árvores na face ou no canteiro central, inclusive podadas ou sem folhas. Esses números não medem área de copas nem comprovam a situação de 2026.</p>
      <a href="/api/validacao/campo" download>Baixar metodologia da evidência de campo</a> · <a href={field.publicationUrl}>Publicação original do IBGE</a>
    </section>
    <section className="validation-section"><h2>Referência aberta e piloto de interpretação</h2>
      <p>Foram preparados {audit.openReference.preparedPanels} painéis de julho. No piloto cego por IA, {audit.aiPilot.reviewedCells} células foram inspecionadas, com presença provável em {audit.aiPilot.likelyVegetationPresenceCells} e resultado indeterminado em {audit.aiPilot.indeterminatePresenceCells}. Nenhuma fração numérica foi aceita. O piloto não é uma estimativa municipal nem uma revisão por dois intérpretes.</p>
      <p className="validation-pending"><strong>{audit.acceptedFractionLabels} de {audit.sampleCells} frações aceitas.</strong> Data-alvo registrada em 01/10/2026. A imagem de julho antecede essa data em 91 dias.</p>
      <p>O diagnóstico entre abril e julho encontrou translação relativa mediana de 2 m. Isso não mede precisão absoluta nem aprova o alinhamento.</p>
      <details><summary>O que falta para calcular a porcentagem validada</summary><ul>{audit.barriers.map((barrier) => <li key={barrier}>{barrier}</li>)}</ul></details>
      <a href="/api/validacao/auditoria" download>Baixar auditoria das referências</a> · <a href={audit.openReference.sourceUrl}>Cena original do INPE</a>
    </section>
    <ValidationGallery cells={cells.features as ValidationCell[]} references={references} />
    <section className="validation-section"><h2>Materiais de conferência</h2><p>As fichas preservam a amostra original e as células sem sinal vegetal, necessárias para procurar omissões. Os resultados só entram no estimador depois de atender aos critérios do protocolo.</p>
      <nav aria-label="Materiais de validação"><a href="/api/validacao/ficha" download>Ficha de interpretação, CSV</a><a href="/api/validacao/celulas" download>Células para SIG, GeoJSON</a><a href="/api/validacao/protocolo" download>Protocolo e incerteza</a><a href="/api/metodologia" download>Metodologia completa</a></nav>
    </section>
  </main>;
}
