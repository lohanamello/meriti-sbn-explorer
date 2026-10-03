# Metodologia de pontuação para o gráfico de priorização hídrica urbana no Rio de Janeiro

## Resumo

Este paper documenta a metodologia usada para produzir as pontuações exibidas no gráfico de priorização hídrica urbana do projeto. A pontuação, denominada `pontuacao_triagem_oportunidade_hidrica_urbana`, é um índice composto em escala de 0 a 100 calculado para os bairros oficiais do município do Rio de Janeiro. O objetivo é apoiar a triagem de territórios onde evidências de suscetibilidade hídrica, pressão de drenagem, exposição populacional, déficit de áreas verdes públicas, contexto de Defesa Civil e presença de âncoras públicas de oportunidade se sobrepõem. O indicador não é um modelo hidráulico, laudo oficial de risco, diagnóstico de saneamento em escala local ou projeto de engenharia. Ele deve ser interpretado como instrumento exploratório de priorização para pesquisa, comunicação técnica e seleção inicial de áreas que merecem investigação mais detalhada.

**Palavras-chave:** priorização territorial; risco hídrico urbano; soluções baseadas na natureza; Rio de Janeiro; indicadores compostos; geoprocessamento.

## 1. Introdução

O gráfico de pontuação foi construído para sintetizar, em uma métrica legível, diferentes tipos de evidência territorial associados a risco hídrico urbano e oportunidade de implantação de soluções baseadas na natureza. Em vez de apresentar uma única variável, como inundação ou densidade populacional, o índice combina camadas públicas de suscetibilidade, hidrografia, população, espaços públicos, equipamentos urbanos e infraestrutura de resposta.

A motivação metodológica é tornar comparáveis bairros com perfis distintos. Alguns bairros apresentam maior sinal de suscetibilidade à inundação, outros concentram população exposta, outros têm menor oferta de praças por residente ou maior presença de equipamentos públicos que podem funcionar como pontos de partida para projetos. A pontuação organiza esses sinais em uma escala comum, permitindo ranqueamento, visualização por faixas e leitura dos componentes que explicam cada resultado.

## 2. Unidade territorial e escopo

A unidade primária de análise é o bairro oficial do Rio de Janeiro, conforme a camada territorial do Data.Rio/Instituto Pereira Passos. O processamento atual considera 166 bairros oficiais. As Áreas de Planejamento (APs) são apresentadas como sínteses agregadas dos bairros, não como unidades nas quais a pontuação foi originalmente estimada.

A Área de Planejamento 3 (AP3) é destacada como escopo de estudo no aplicativo, com 81 bairros pontuados. Entretanto, a normalização dos indicadores é municipal: cada bairro da AP3 é comparado ao conjunto completo de bairros oficiais do Rio. Isso evita que a AP3 seja analisada em uma escala fechada e permite interpretar a posição relativa de seus bairros no contexto da cidade.

As sínteses por AP são calculadas por média ponderada dos scores dos bairros. Quando há população do Censo 2022 disponível, a ponderação usa população; nos casos sem população, usa-se área oficial como fallback. Essa regra preserva a interpretação de exposição populacional quando possível e evita descartar unidades territoriais por ausência parcial de dados censitários.

## 3. Fontes de dados

A pontuação usa apenas fontes promovidas na etapa de curadoria por serem rastreáveis, espacialmente harmonizáveis e úteis para a leitura de risco hídrico urbano ou oportunidade territorial.

As principais fontes são:

| Fonte | Uso metodológico |
| --- | --- |
| Data.Rio/IPP - limites administrativos | Definição de APs, RAs e bairros oficiais. |
| Data.Rio/IPP - hidrografia | Densidade de hidrografia, cursos d'água cobertos e pressão de drenagem. |
| Data.Rio/IPP - praças | Área de praças por residente e densidade de praças. |
| Data.Rio/IPP - escolas municipais e serviços de saúde | Âncoras públicas de oportunidade. |
| Data.Rio/IPP - sirenes, pontos de apoio, NUPDEC e alojamentos | Contexto de Defesa Civil e resposta territorial. |
| IBGE - Censo 2022 por setores agregados | População total e densidade populacional por bairro harmonizado. |
| SGB/CPRM - suscetibilidade 2018 | Sinal de suscetibilidade à inundação alocado aos bairros. |
| SNIS 1995-2022 | Contexto temporal de saneamento, sem uso direto na pontuação por bairro. |

Algumas fontes coletadas foram intencionalmente deixadas fora do score. O SNIS foi mantido como contexto porque sua granularidade é municipal/prestador, não discriminando bairros. O MapBiomas foi diferido porque exige um pipeline reprodutível de estatística zonal raster antes de ser incorporado de modo defensável.

## 4. Harmonização espacial

As camadas processadas são convertidas para EPSG:4326 para renderização web. A geometria bruta do Data.Rio é preservada no armazenamento bruto. A associação dos dados aos bairros usa três estratégias:

1. Junção direta por código de bairro quando a fonte já traz identificador territorial compatível, como hidrografia e praças.
2. Alocação ponto-em-polígono para escolas, serviços de saúde e ativos da Defesa Civil.
3. Alocação por centróide para polígonos de suscetibilidade SGB/CPRM e áreas protegidas.

A alocação por centróide é adequada para triagem territorial, mas não deve ser lida como interseção precisa de risco em escala de lote. Polígonos que cruzam limites de bairros podem ser atribuídos a um único bairro quando seu centróide cai dentro dele.

## 5. Normalização

Todos os componentes do score são convertidos em rankings percentis municipais, em escala de 0 a 100, calculados sobre os bairros com valores válidos. Para cada variável:

\[
P_{i,x} = \frac{rank_{i,x}}{n_x - 1} \times 100
\]

onde \(P_{i,x}\) é o percentil do bairro \(i\) na variável \(x\), \(rank_{i,x}\) é a posição ordinal do bairro, iniciada em zero, quando os valores válidos são ordenados de menor para maior, e \(n_x\) é o número de bairros com valor válido para aquela variável.

Assim, valores próximos de 100 indicam posição alta no conjunto municipal para a variável analisada. No componente de déficit de áreas verdes públicas, a direção é invertida: bairros com menor área de praça por habitante recebem maior sinal de déficit.

Se uma variável ou componente estiver ausente para um bairro, ela não recebe imputação. O cálculo ignora o valor ausente e renormaliza os pesos restantes. Essa decisão evita criar precisão artificial em territórios sem evidência suficiente.

## 6. Componentes do índice

A pontuação final combina seis componentes. Cada componente também é expresso em escala 0-100.

### 6.1 Exposição a inundação

Peso na pontuação final: 0,30.

Este componente representa o principal sinal de suscetibilidade hídrica. Ele combina:

| Subindicador | Peso interno |
| --- | ---: |
| Índice ponderado de área de inundação SGB/CPRM | 0,65 |
| Participação de classes altas de inundação SGB/CPRM | 0,20 |
| Densidade de hidrografia municipal | 0,15 |

A lógica é dar maior peso à evidência direta de suscetibilidade, mantendo a hidrografia como apoio contextual.

### 6.2 Pressão de drenagem

Peso na pontuação final: 0,20.

Este componente representa pressão contextual associada à rede hidrográfica e a cursos d'água cobertos. Ele combina:

| Subindicador | Peso interno |
| --- | ---: |
| Densidade de hidrografia por km² | 0,50 |
| Densidade de hidrografia coberta por km² | 0,30 |
| Participação da hidrografia coberta no total | 0,20 |

O componente não mede capacidade hidráulica, manutenção, obstrução, recorrência de alagamento ou dimensionamento de drenagem. Ele funciona como proxy espacial de pressão e complexidade territorial.

### 6.3 Exposição social

Peso na pontuação final: 0,20.

Este componente usa a densidade populacional do Censo 2022 agregada aos bairros oficiais. Bairros mais densos recebem percentis mais altos por concentrarem mais residentes potencialmente expostos por unidade de área. A variável usada é exposição populacional, não um índice completo de vulnerabilidade social.

### 6.4 Déficit de áreas verdes públicas

Peso na pontuação final: 0,20.

O componente é calculado a partir da área de praças públicas por 1.000 residentes. Primeiro calcula-se o percentil municipal de provisão de praça por residente; depois o valor é invertido:

\[
G_i = 100 - P_{i,pracas}
\]

onde \(G_i\) é o déficit de áreas verdes públicas do bairro \(i\). Dessa forma, menor provisão relativa de praça produz maior pontuação de déficit. O indicador é estreito por desenho: ele mede apenas praças públicas cadastradas, não cobertura vegetal total, arborização, permeabilidade, áreas privadas ou qualidade ecológica.

### 6.5 Contexto de Defesa Civil

Peso na pontuação final: 0,05.

Este componente expressa a presença territorial de ativos de alerta e resposta. Ele combina:

| Subindicador | Peso interno |
| --- | ---: |
| Densidade de ativos de Defesa Civil por km² | 0,65 |
| Densidade de sirenes por km² | 0,35 |

O resultado deve ser lido como contexto de reconhecimento e resposta institucional, não como medição direta de perigo.

### 6.6 Espaço de oportunidade

Peso na pontuação final: 0,05.

Este componente estima a presença de âncoras públicas ou públicas-servientes que podem apoiar futuras soluções baseadas na natureza. Ele combina:

| Subindicador | Peso interno |
| --- | ---: |
| Densidade de equipamentos públicos por km², incluindo escolas e serviços de saúde | 0,70 |
| Densidade de praças por km² | 0,30 |

Esse componente não prova disponibilidade fundiária, viabilidade construtiva, propriedade, permissão de uso ou capacidade de manutenção. Ele apenas sinaliza onde existem ativos urbanos que podem orientar investigação futura.

## 7. Fórmula da pontuação final

Para cada bairro \(i\), a pontuação final é a média ponderada dos componentes válidos:

\[
S_i =
\frac{
\sum_{c \in V_i} w_c C_{i,c}
}{
\sum_{c \in V_i} w_c
}
\]

onde \(V_i\) é o conjunto de componentes disponíveis para o bairro, \(w_c\) é o peso do componente e \(C_{i,c}\) é a pontuação normalizada do bairro naquele componente. Quando todos os componentes estão disponíveis, a fórmula expandida é:

\[
S_i =
0{,}30F_i +
0{,}20D_i +
0{,}20E_i +
0{,}20G_i +
0{,}05C_i +
0{,}05O_i
\]

onde:

| Símbolo | Componente |
| --- | --- |
| \(F_i\) | Exposição a inundação |
| \(D_i\) | Pressão de drenagem |
| \(E_i\) | Exposição social |
| \(G_i\) | Déficit de áreas verdes públicas |
| \(C_i\) | Contexto de Defesa Civil |
| \(O_i\) | Espaço de oportunidade |

Quando todos os componentes estão disponíveis, a soma dos pesos é 1. Quando algum componente é ausente, apenas os componentes válidos entram no numerador e no denominador, mantendo a escala de 0 a 100.

## 8. Faixas exibidas no gráfico

O gráfico usa cinco faixas de interpretação:

| Pontuação | Faixa |
| ---: | --- |
| 80 a 100 | Muito alto |
| 65 a 79,999 | Alto |
| 50 a 64,999 | Elevado |
| 35 a 49,999 | Moderado |
| 0 a 34,999 | Mais baixo |

Essas faixas são classes de triagem. Elas não indicam risco oficial, prioridade pública definitiva ou recomendação automática de obra. Seu papel é tornar a leitura visual mais clara e permitir comparação inicial entre territórios.

## 9. Resultados principais do processamento atual

O processamento atual cobre 166 bairros oficiais e 5 Áreas de Planejamento. A AP3 concentra 81 bairros pontuados e aparece como área de estudo destacada. A síntese da AP3 tem pontuação 58,4189, classificada como "elevada". Os componentes agregados da AP3 indicam valores altos em exposição social, déficit de áreas verdes públicas e espaço de oportunidade, além de sinal intermediário-alto em exposição a inundação.

Os maiores scores da AP3 no processamento atual incluem Olaria, Cachambi, Osvaldo Cruz, Brás de Pina, Parada de Lucas, Manguinhos, Colégio, Abolição, Portuguesa e Anchieta. Esses nomes são saídas do modelo de triagem e não devem ser tratados como lista final de projetos.

No conjunto municipal, os dois maiores scores atuais são Catumbi e Maracanã. Essa posição decorre da combinação dos componentes em percentis municipais; não significa, isoladamente, que esses territórios sejam os mais perigosos ou que tenham projetos mais viáveis.

## 10. Interpretação adequada

A pontuação deve ser usada para responder a perguntas de triagem, como:

- Quais bairros concentram sinais sobrepostos de suscetibilidade hídrica, densidade populacional e déficit de áreas verdes públicas?
- Onde há ativos públicos que podem orientar uma investigação inicial de soluções baseadas na natureza?
- Quais componentes explicam a posição relativa de um bairro no gráfico?
- Que territórios devem ser analisados com dados mais detalhados antes de qualquer decisão de projeto?

A pontuação não deve ser usada para afirmar:

- que um bairro terá inundação;
- que uma intervenção específica é tecnicamente viável;
- que há disponibilidade fundiária ou autorização institucional;
- que um bairro é "seguro" ou "inseguro";
- que o índice substitui estudo hidráulico, vistoria, modelagem hidrológica ou diagnóstico social detalhado.

## 11. Limitações

A metodologia tem limitações conhecidas:

1. A suscetibilidade SGB/CPRM foi alocada por centróide, não por interseção completa de polígonos com bairros.
2. A hidrografia funciona como proxy de pressão de drenagem, sem medir capacidade, conservação ou recorrência de eventos.
3. A exposição social usa densidade populacional, não vulnerabilidade social multidimensional.
4. O déficit verde usa praças públicas por residente, não vegetação total, impermeabilização, arborização ou qualidade ambiental.
5. O contexto de Defesa Civil indica presença de ativos, não intensidade de risco.
6. O espaço de oportunidade indica presença de equipamentos e praças, não viabilidade jurídica, técnica ou financeira.
7. O SNIS foi excluído da pontuação por não discriminar bairros no recorte atual.
8. MapBiomas foi diferido até haver rotina reprodutível de recorte raster e estatística zonal.

Essas limitações não invalidam o uso do índice como ferramenta de triagem, mas restringem o tipo de conclusão que pode ser extraída do gráfico.

## 12. Conclusão

O gráfico de pontuação resume um modelo composto, transparente e auditável de priorização hídrica urbana. Sua contribuição principal é organizar evidências heterogêneas em uma escala comum e explicar por que determinados bairros aparecem com maior ou menor prioridade relativa. A metodologia privilegia rastreabilidade, normalização municipal, separação explícita entre componentes e comunicação de incerteza.

O resultado deve ser interpretado como ponto de partida para investigação. As áreas com maior score são candidatas a análise posterior, com checagem local, dados hidráulicos mais finos, validação social e avaliação de viabilidade institucional. A força do modelo está em orientar onde olhar primeiro, não em substituir o trabalho técnico necessário para definir intervenções.

## Referências e arquivos metodológicos do projeto

- `docs/methodology/scoring-model.md`
- `docs/methodology/evidence-model.md`
- `docs/methodology/territorial-units.md`
- `docs/methodology/uncertainty.md`
- `docs/sources/data-rio.md`
- `docs/sources/ibge.md`
- `docs/sources/sgb-cprm.md`
- `docs/sources/snis-sinisa.md`
- `scripts/curate/build_phase2_outputs.mjs`
- `data/processed/evidence/neighborhood-score-components.csv`
- `data/processed/evidence/planning-area-score-components.json`
- `data/processed/metadata/data-quality-report.json`
