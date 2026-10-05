import Link from "next/link";
import type { Phase3ExplorerData } from "@/types/phase3";

export function MethodologyReport({ data }: { data: Phase3ExplorerData }) {
  const final = data.vegetationResearch.finalReview;
  if (!final) throw new Error("Resultados da revisão concluída indisponíveis.");
  const s = final.summary;
  const date = final.closedOn.split("-").reverse().join("/");
  return <main className="validation-page methodology-page">
    <header className="validation-header">
      <Link href="/">← Voltar ao mapa</Link>
      <p className="eyebrow">São João de Meriti · memória da pesquisa</p>
      <h1>Metodologia e resultados</h1>
      <p>O atlas reúne evidências sobre vegetação, água e condições sociais para apoiar o estudo de soluções baseadas na natureza. Esta página explica as fontes, o processamento e os resultados da revisão visual encerrada em {date}.</p>
      <p className="methodology-completed">Revisão visual concluída · resultados incorporados à documentação</p>
      <dl className="validation-facts methodology-facts">
        <div><dt>Células na análise automática</dt><dd>{s.analyzedCells}</dd></div>
        <div><dt>Última rodada concluída</dt><dd>{s.priorityCompleted} de {s.priorityCells}</dd></div>
        <div><dt>Células revistas pelo critério de presença</dt><dd>{s.humanPresenceReviewed}</dd></div>
      </dl>
    </header>
    <nav className="methodology-nav" aria-label="Seções da metodologia">
      <a href="#procedimento">Como foi feito</a><a href="#resultados">Resultados da revisão</a><a href="#fontes">Fontes do mapa</a><a href="#alcance">Alcance dos resultados</a><a href="#materiais">Materiais da entrega</a>
    </nav>
    <section className="validation-section" id="procedimento">
      <h2>Como chegamos aos resultados</h2>
      <ol className="methodology-steps">
        <li><strong>Definição do objeto.</strong> Vegetação viva inclui árvores, arbustos, gramados e jardins. Solo exposto e lastro ferroviário entram como presença somente onde há plantas identificáveis. Água, telhados e asfalto sem plantas ficam como ausência. Permeabilidade e potencial de renaturalização exigem indicadores próprios.</li>
        <li><strong>Organização territorial.</strong> Utilizamos o limite municipal e os recortes do Censo 2022: 809 setores, 16 bairros e três distritos. Indicadores conservam o ano e a escala de cada fonte; localidades do atlas escolar têm identificação própria e limites aproximados.</li>
        <li><strong>Processamento das imagens.</strong> O sinal recente usa seis cenas Sentinel-2 entre 05/08 e 01/10/2026, em pixels de 10 m, com máscara de qualidade e pelo menos três observações válidas. O índice NDVI combina vermelho e infravermelho próximo: (infravermelho − vermelho) ÷ (infravermelho + vermelho). Os indicadores apresentam limiares 0,3, 0,4 e 0,5 para observar a sensibilidade.</li>
        <li><strong>Amostra e comparação visual.</strong> Foram sorteadas {s.analyzedCells} células da grade de 10 m, recortadas pelo município e distribuídas por estratos de sinal, classe urbana e áreas protegidas. A semente registrada é 33051092026. A inspeção comparou a imagem detalhada Esri com painéis CBERS de 02/07/2026: pancromático de 2 m, RGB e infravermelho com bandas de 8 m.</li>
        <li><strong>Ajuste do critério humano.</strong> Após a primeira interpretação, adotamos presença identificável de plantas dentro do contorno, mesmo em pequena proporção. A predominância de telhados ou a cor de barro do solo não bastam para indicar ausência quando há vegetação visível. As respostas anteriores foram preservadas no histórico.</li>
        <li><strong>Triagem e encerramento.</strong> A análise espectral examinou as {s.analyzedCells} células e selecionou {s.priorityCells} para a rodada final: quatro dúvidas, 15 negativos antigos com sinal vegetal e 11 sem composto recente válido. Todas foram classificadas pelo pesquisador. A seleção usou divergências, disponibilidade de dados, mistura de superfícies e diferenças temporais; a pontuação serviu para ordenar a revisão.</li>
      </ol>
    </section>
    <section className="validation-section" id="resultados">
      <h2>Resultados da revisão visual</h2>
      <p>Na última rodada, {s.priorityPresent} células receberam presença de vegetação e {s.priorityAbsent} receberam ausência. Somadas às 42 presenças revistas anteriormente, são {s.humanPresenceReviewed} células interpretadas pelo mesmo critério.</p>
      <div className="neighborhood-table"><table className="temporal-table">
        <caption>Classificações humanas pelo critério de presença</caption>
        <thead><tr><th scope="col">Etapa</th><th scope="col">Presença</th><th scope="col">Ausência</th><th scope="col">Sem classificação</th><th scope="col">Total</th></tr></thead>
        <tbody><tr><th scope="row">Últimas 30 células</th><td>{s.priorityPresent}</td><td>{s.priorityAbsent}</td><td>{s.priorityUnsure}</td><td>{s.priorityCompleted}</td></tr>
          <tr><th scope="row">Total com critério de presença</th><td>{s.humanPresent}</td><td>{s.humanAbsent}</td><td>{s.humanUnsure}</td><td>{s.humanPresenceReviewed}</td></tr></tbody>
      </table></div>
      <p>O arquivo consolidado preserva {s.humanRecordsSaved} registros humanos: {s.humanPresenceReviewed} pelo critério atual e {s.historicalCriterionRecords} respostas históricas de “Não confere”. Outras {s.automaticOnly} células têm somente análise automática. Os registros históricos conservam seu significado original e ficam identificados nos downloads.</p>
      <details><summary>Distribuição do sinal espectral nas 400 células</summary>
        <p>São classes auxiliares de triagem, calculadas antes da última rodada; sinal baixo pode coexistir com plantas pequenas.</p>
        <ul><li>NDVI ≥ 0,5: {s.signalCounts.strong_signal} células.</li><li>NDVI de 0,3 a menos de 0,5: {s.signalCounts.intermediate_signal} células.</li><li>NDVI abaixo de 0,3: {s.signalCounts.weak_signal} células.</li><li>Sem composto recente válido: {s.signalCounts.insufficient_data} células.</li></ul>
      </details>
    </section>
    <section className="validation-section" id="fontes">
      <h2>O que cada fonte informa no mapa</h2>
      <dl className="methodology-sources">
        <div><dt>Vegetação geral · Sentinel-2, 2026</dt><dd>Sinal espectral de plantas em pixels de 10 m. O percentual corresponde à área dos pixels acima do limiar escolhido, sujeito a misturas de plantas, solo e construções.</dd></div>
        <div><dt>Cobertura do solo · MapBiomas, 2019–2023</dt><dd>Classes de uso e cobertura da mesma coleção para comparação anual. A classe urbana pode incluir árvores, quintais e jardins.</dd></div>
        <div><dt>Copas estimadas · CHMv2, imagem de 16/09/2019</dt><dd>Modelo de altura de copas, publicado em 2026. Os limiares de 2, 3 e 5 m descrevem a sensibilidade do modelo; edifícios e sombras podem produzir erros.</dd></div>
        <div><dt>Persistência do verde · Sentinel-2, 2025</dt><dd>Uma cena por mês. Sinal recorrente exige NDVI ≥ 0,4 em pelo menos 80% das datas válidas, seis observações e representação de todos os trimestres.</dd></div>
        <div><dt>Árvores nas ruas · IBGE, coleta de 2022–2023</dt><dd>Presença observada nas faces de rua e moradores expostos a esse entorno. A medida descreve vias e pessoas; tem unidade diferente da área de copas.</dd></div>
        <div><dt>Renda, população e saneamento · Censo 2022</dt><dd>Renda média e mediana dos responsáveis pelos domicílios com rendimento, em reais nominais de 2022. Cada território usa seu agregado oficial. População e saneamento seguem seus universos e escalas; valores ausentes permanecem sem dados.</dd></div>
        <div><dt>Água e áreas protegidas · SGB, IBGE e INEA</dt><dd>Suscetibilidade à inundação do SGB de 2015, hidrografia BC25 de 2018 e seis unidades protegidas do cadastro INEA 2024/ICMS 2025. Espaços sem classe de inundação publicada permanecem sem informação de risco.</dd></div>
        <div><dt>Imagens para inspeção · CBERS e Esri</dt><dd>CBERS oferece referências abertas de abril e julho de 2026. Esri foi utilizada para visualização, com data e nitidez variáveis por local. A ampliação facilita a leitura, mantendo a resolução original das fontes.</dd></div>
      </dl>
      <p><Link href="/catalogo">Consultar o catálogo, as fontes e suas condições de uso</Link></p>
    </section>
    <section className="validation-section" id="alcance">
      <h2>Alcance dos resultados desta entrega</h2>
      <p>A revisão qualitativa está encerrada e documentada. Ela ajuda a interpretar divergências entre a imagem e o sinal espectral, especialmente em células com pouca vegetação ou mistura de superfícies. As classificações humanas e os valores dos sensores continuam identificados como evidências distintas.</p>
      <p>As respostas de presença não fornecem a fração de vegetação de cada célula. Por isso, a entrega mantém os percentuais dos sensores com suas definições originais. Não foi calculada uma porcentagem municipal corrigida pela revisão nem um intervalo de confiança observado. A seleção dirigida das últimas 30 células também limita o cálculo de acurácia para todo o município.</p>
      <p>A referência CBERS de julho antecede a data-alvo de 01/10/2026 em 91 dias. Datas variáveis da imagem Esri, sombras, resolução e alinhamento limitam a comparação. As contagens da revisão são resultados dessa interpretação visual.</p>
      <p>Os indicadores apoiam a investigação de soluções baseadas na natureza. Solo sem construção, capacidade de drenagem, acesso ao terreno e viabilidade de implantação requerem análises específicas. O atlas apresenta as evidências sem uma pontuação composta de prioridade.</p>
    </section>
    <section className="validation-section" id="materiais">
      <h2>Materiais da entrega</h2>
      <p>Os resultados ficam salvos com a versão publicada do projeto. Os arquivos registram os critérios, a origem das respostas e os identificadores da amostra para reprodução e citação.</p>
      <nav aria-label="Materiais da entrega">
        <a href="/api/validacao/relatorio" download>Relatório da revisão concluída</a>
        <a href="/api/metodologia" download>Metodologia técnica completa</a>
        <a href="/api/validacao/resultados" download>Resultados das 400 células · CSV</a>
        <a href="/api/validacao/resultados-metodo" download>Resultados e procedência · JSON</a>
        <a href="/api/validacao/avaliacoes-finais" download>{s.humanRecordsSaved} avaliações humanas preservadas · JSON</a>
        <a href="/api/validacao/celulas" download>Geometrias das 400 células · GeoJSON</a>
      </nav>
    </section>
  </main>;
}
