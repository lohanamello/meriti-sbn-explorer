# Atlas ambiental de São João de Meriti — metodologia da revisão concluída

Encerramento da rodada visual: **05/10/2026**. Versão da entrega: `meriti.review-closure.v1`.

A interface de classificação foi substituída por uma página permanente de metodologia e resultados. O encerramento é da revisão qualitativa realizada pelo pesquisador; os indicadores cartográficos conservam suas definições e datas. Os arquivos de respostas, a análise automática e a amostra foram preservados.

## Objetivo e unidade de observação

Investigar a distribuição da vegetação viva, incluindo árvores, arbustos, gramados e jardins, em São João de Meriti, e reunir evidências territoriais para estudos de soluções baseadas na natureza. A célula corresponde à interseção de um pixel nativo de 10 m com o limite municipal; sua área pode ser menor que 100 m² nas bordas.

A interpretação humana usa **presença identificável de plantas dentro do contorno**, mesmo quando as plantas ocupam uma pequena proporção. Telhados ou asfalto predominantes não tornam a célula sem vegetação quando há plantas visíveis. Solo exposto, lastro ferroviário e água sem plantas são ausência de vegetação. Grama ou outras plantas presentes sobre solo de cor de barro contam como presença. Permeabilidade e potencial de renaturalização constituem objetos distintos, sem inferência automática a partir dessas respostas.

## Fontes e processamento

- **Territórios:** limite municipal, 809 setores censitários, 16 bairros e três distritos do IBGE, Censo 2022. Indicadores oficiais são associados por código territorial. As referências locais do atlas escolar conservam identificação e limites aproximados próprios.
- **Sentinel-2 recente:** seis cenas entre 05/08 e 01/10/2026, grade de 10 m em UTM 23S, máscara de qualidade e composto de NDVI com pelo menos três observações aceitas. NDVI = (infravermelho próximo − vermelho)/(infravermelho próximo + vermelho). São disponibilizados limiares 0,3, 0,4 e 0,5 para sensibilidade. Indicadores territoriais exigem cobertura suficiente segundo o procedimento técnico registrado.
- **Referência visual aberta:** CBERS-4A/WPM L4 de 02/07/2026, pancromático a 2 m e bandas multiespectrais a 8 m. Foram preparados 400 painéis PAN, RGB e NIR-R-G com estiramento por banda e ampliação pelo vizinho mais próximo. Os valores digitais dessa referência não foram tratados como reflectância calibrada nem usados para gerar NDVI científico.
- **Referência visual detalhada:** Esri World Imagery, usada para inspeção no navegador. Datas e nitidez variam espacialmente. A revisão não processou essa imagem para gerar uma camada temática nem produziu detalhes por IA.
- **Evidências complementares:** MapBiomas 10 m, coleção 2 beta, 2019–2023; CHMv2 com imagem local de 16/09/2019 e publicação em 2026; Sentinel-2 mensal de 2025; arborização nas faces de rua observada pelo IBGE em 2022–2023. Cada produto conserva seu objeto, ano e limitações.
- **Contexto social e ambiental:** população, saneamento e renda do Censo 2022; renda média e mediana nominal dos responsáveis com rendimento, sem correção monetária e sem imputação de dados suprimidos; suscetibilidade SGB de 2015; hidrografia BC25 de 2018; cadastro INEA 2024/ICMS 2025. Renda dos responsáveis tem universo diferente de renda domiciliar per capita. O catálogo documenta fontes e condições de uso.

## Desenho da amostra e triagem

O desenho original sorteou 400 células entre 353.646 células com área municipal positiva. Utilizou `numpy.random.PCG64`, semente `33051092026`, estratos de áreas protegidas e, nas demais áreas, disponibilidade de NDVI e faixas de NDVI cruzadas com a classe urbana do MapBiomas 2023. As probabilidades de inclusão são diferentes entre estratos; os pesos e as geometrias permanecem no desenho registrado.

A análise auxiliar automática examinou todas as 400 células. Foram extraídos NDVI de 2026, número de observações válidas, NDVI e recorrência de 2025, amplitude do sinal na vizinhança, área recortada e disponibilidade da referência multiespectral. As classes auxiliares são:

| Sinal espectral na triagem | Regra | Células |
| --- | --- | ---: |
| Forte | NDVI ≥ 0,5 | 76 |
| Intermediário | 0,3 ≤ NDVI < 0,5 | 88 |
| Baixo | NDVI < 0,3 | 216 |
| Dados insuficientes | Sem composto recente válido | 20 |

Essas classes descrevem sinal do sensor, não presença ou ausência conclusiva de todas as plantas. Nenhum classificador supervisionado foi treinado com os registros históricos.

A seleção final de 30 células priorizou quatro dúvidas humanas, 15 registros antigos de ausência com NDVI a partir de 0,3 e 11 células sem composto recente válido. Mistura de superfícies, disponibilidade de pixels e divergências temporais também participaram da ordenação. O limite de 30 foi um limite de trabalho, não uma garantia de confiança. O subconjunto final é dirigido por incerteza, embora pertença à amostra original probabilística.

## Resultados humanos consolidados

O arquivo entregue em 05/10/2026 contém **exatamente as 30 prioridades**, com identificadores únicos, critério `visible-vegetation-v1` e datas de gravação posteriores à linha de base. Todas foram concluídas: 12 presenças e 18 ausências, sem resposta indeterminada nessa rodada.

| Etapa | Presença | Ausência | Indeterminada | Total |
| --- | ---: | ---: | ---: | ---: |
| Revisão anterior pelo critério de presença | 42 | 0 | 0 | 42 |
| Última rodada prioritária | 12 | 18 | 0 | 30 |
| Total pelo mesmo critério | **54** | **18** | **0** | **72** |

O acervo consolidado contém **130 registros humanos distintos**. O arquivo anterior tinha 122 registros; 22 foram atualizados pela última rodada e oito foram acrescentados. As 42 presenças anteriormente revistas foram mantidas.

Além das 72 respostas pelo critério atual, permanecem **58 respostas históricas de ausência** sem revisão explícita desse critério. Elas podem refletir o critério anterior de predominância de construções. Outras **270 células** têm somente análise espectral. Portanto, 328 células não têm uma referência humana harmonizada de presença. Isso é um limite documentado da entrega encerrada, não uma nova tarefa da interface.

Os arquivos finais mantêm as respostas anteriores às substituições, a origem de cada interpretação e os valores do sensor. A classificação humana não foi preenchida automaticamente nas células sem referência.

## Interpretação e alcance

A revisão concluída é uma verificação visual qualitativa da presença de plantas em um conjunto de células. Ela documenta ambiguidades em áreas urbanas e evita tratar ausência de predominância vegetal como ausência de plantas.

**Não foram calculados fração vegetal municipal corrigida, intervalo de confiança observado ou acurácia municipal a partir dessas respostas.** Presença binária não informa a proporção vegetal da célula; a última seleção é dirigida por dúvida; faltam referências harmonizadas nas outras células. O limite de precisão teórico do planejamento amostral permanece apenas um parâmetro de planejamento, não um resultado obtido.

Os percentuais cartográficos continuam sendo os indicadores originais de cada fonte: por exemplo, área de pixels acima do limiar NDVI, área classificada pelo MapBiomas, área modelada por altura de copas ou proporção de moradores em faces com árvores. A revisão não recalculou rasters, geometrias ou esses percentuais. Não foi produzido ranking composto de oportunidade.

A referência CBERS de 02/07/2026 precede a data-alvo de 01/10/2026 em 91 dias. Datas heterogêneas da imagem Esri, sombras, vegetação pequena, diferenças de resolução e alinhamento limitam a interpretação. O diagnóstico relativo de 2 m entre imagens de abril e julho não atesta precisão absoluta de registro.

Identificar terreno sem construção, capacidade de infiltração ou potencial para receber uma solução baseada na natureza exige critérios próprios de solo, drenagem, contaminação, domínio e disponibilidade da área. Essas características não são deduzidas das respostas de vegetação.

## Arquivos e reprodução

- `review-closure.json`: método, limites, resumo, 400 registros, respostas atuais e anteriores, valores espectrais e hashes SHA-256 dos insumos de revisão.
- `review-closure.csv`: 400 linhas, com origem da interpretação, presença humana quando disponível, resposta histórica separada e classe espectral. Fração vegetal e confiança probabilística permanecem vazias.
- `human-reviews-final.json`: 130 respostas humanas consolidadas no esquema original de backup. O campo original `status: draft` foi preservado para compatibilidade; o encerramento autorizado desta rodada está registrado no relatório, sem converter esses rótulos em frações aceitas.
- `sample-cells-blinded.geojson`, `sample-master.csv` e `sampling-design.json`: amostra, geometria, estratos, probabilidades e integridade originais.
- `meriti.md`: metodologia técnica completa das fontes e camadas. Os protocolos e a auditoria anteriores permanecem como memória do desenvolvimento.

Com os dois backups originais preservados, executar:

```bash
.venv/bin/python scripts/meriti/close_review.py \
  --baseline data/raw/meriti/user_review_20261004/reviews.json \
  --final data/raw/meriti/user_review_20261005/reviews-final-30.json
```

O procedimento rejeita IDs desconhecidos ou duplicados, ausência de prioridades, critério incompatível e avaliações que não sejam posteriores à linha de base. Consolida respostas sem alterar os rasters e atualiza o pacote e o manifesto. `build.py` reaplica os metadados de encerramento nas futuras compilações do pacote.

Página de entrega: [Metodologia e resultados](https://meriti-sbn-explorer.vercel.app/metodologia). O [catálogo](https://meriti-sbn-explorer.vercel.app/catalogo) e a [metodologia técnica completa](https://meriti-sbn-explorer.vercel.app/api/metodologia) contêm fontes primárias, atribuições e controles detalhados.
