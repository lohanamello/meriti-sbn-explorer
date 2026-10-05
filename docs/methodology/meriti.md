# Indicadores territoriais de São João de Meriti

## Decisões do pesquisador

Victor confirmou os bairros do IBGE como base principal e escolheu apresentar somente indicadores, sem pontuação composta ou ranking. A interface mantém o mapa, as camadas, as lentes de interpretação e o catálogo do projeto original. A metodologia de pontuação do Rio não se aplica a Meriti.

## Unidade e integridade territorial

Município IBGE 3305109. A malha estadual com atributos do Censo 2022, preservada na coleta anterior, contém 809 setores de Meriti e 440.962 pessoas. O hash SHA-256 do arquivo foi conferido contra sua procedência original.

Os 16 bairros e os três distritos foram construídos por união dos setores com o mesmo código oficial. Cada divisão conserva a população municipal. Há bairros que atravessam distritos. O aplicativo oferece as divisões separadamente, sem forçar uma relação de pertencimento único.

As áreas e interseções vetoriais são calculadas em SIRGAS 2000 / UTM 23S, EPSG:31983. As geometrias da aplicação são publicadas em EPSG:4326. O processamento Sentinel-2 conserva a grade WGS 84 / UTM 23S, EPSG:32723, conforme descrito adiante.

A densidade é população dividida pela área territorial total em km². A camada usa os 809 setores, independentemente da escala selecionada para o cartão. Os intervalos são menos de 2.500, 2.500 a menos de 10.000, 10.000 a menos de 20.000, 20.000 a menos de 40.000, 40.000 a menos de 80.000 e 80.000 habitantes/km² ou mais. São intervalos de visualização, não classes oficiais. Não há redistribuição da população a edifícios ou pixels. Um setor pode conter áreas não residenciais; a densidade não mede renda, pobreza ou vulnerabilidade social. O cartão calcula o valor da unidade selecionada, enquanto a camada conserva o detalhe setorial.

## Inundação

A carta SGB/CPRM de 2015 tem escala 1:20.000. Foram lidos 284 polígonos, reparada uma geometria inválida e efetuado o recorte municipal. A união das classes impede contagem duplicada nas interseções.

O indicador é `100 × área de interseção com classes média ou alta / área do território`. O aplicativo também apresenta a parcela sem classe publicada. A fonte classifica aproximadamente 45,84% da área municipal. Áreas fora desses polígonos não recebem classe baixa ou valor de risco zero.

Suscetibilidade não é probabilidade de inundação, profundidade esperada, registro de evento ou diagnóstico atual da drenagem. Nenhuma classe é convertida em ranking.

Fonte primária: [SGB/CPRM, carta de São João de Meriti](https://rigeo.sgb.gov.br/handle/doc/15092).

## Saneamento

Foram adquiridos o dicionário oficial e as características dos domicílios do Censo 2022. A tabela nacional por setor foi preservada, mas os indicadores de saneamento usam os agregados oficiais por bairro. Assim, não é necessário somar células setoriais suprimidas ou tratá-las como zero.

Denominador: `V00001`, domicílios particulares permanentes ocupados, tabela de características dos domicílios, parte 1.

Numerador: soma de `V00312` a `V00316`, parte 2. São as categorias fossa rudimentar ou buraco, vala, rio/lago/córrego/mar, outra forma e ausência de banheiro ou sanitário. O rótulo publicado é "esgotamento precário declarado", apresentado como mínimo observado. A agregação inclui "outra forma", uma categoria cuja interpretação requer cautela.

As categorias de `V00309` a `V00316` não esgotam o denominador. Há 616 domicílios sem categoria publicada nos totais utilizados, de um universo de 168.765. A menor cobertura de categorias reportadas entre bairros é 99,43%. O restante não é classificado como atendimento adequado. Os totais e a diferença são preservados no arquivo intermediário e mostrados nos cartões por bairro.

`V00309` reúne rede geral ou pluvial. Não pode ser descrita como coleta com tratamento. Os indicadores municipais e de prestadores do SINISA foram coletados, mas permanecem diferidos, sem replicação nos bairros. Nas escalas de município, distrito e setor, a interface explicita que o saneamento está disponível por bairro.

Fontes primárias: [agregados do Censo 2022](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/), [planilhas SINISA](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/planilhas-de-informacoes-e-indicadores). Os URLs exatos e hashes estão no inventário e no manifesto de procedência.

## Cobertura do solo e comparação temporal

MapBiomas Brasil 10 m, coleção 2 beta, integração v1, anos 2019 a 2023. Todos os anos pertencem à mesma coleção. Os arquivos nacionais preservados foram lidos, e o recorte local foi gravado em GeoTIFF. Cada recorte tem hash SHA-256 registrado.

Os recortes usam uma grade comum de 10 m em EPSG:31983, com reamostragem pelo vizinho mais próximo. O centro de cada pixel determina seu pertencimento a um território. As proporções usam pixels classificados, com cobertura válida registrada separadamente. O recorte municipal contém 352.127 pixels válidos em todos os anos. Os limites territoriais permanecem os de 2022 para que uma alteração de fronteira não apareça como alteração de cobertura.

Classes de vegetação incluídas: 3, 4, 5, 9, 11, 12, 32, 49 e 50. No recorte local, aparecem as classes 3 e 11 desse grupo. As classes 15 e 21 são pastagem e mosaico de usos; não são contabilizadas como vegetação nativa ou arborização. Classe urbana: 24. A classe urbana não equivale a superfície impermeável. Pixels zero permanecem sem informação.

O indicador municipal de manchas vegetais varia de aproximadamente 0,213% em 2019 a 0,181% em 2023. Não é uma estimativa de cobertura de copas de árvores. Árvores de rua, quintais, jardins pequenos e mistura dentro dos pixels podem estar representados pela classe urbana. As diferenças entre anos também incluem erro de classificação; o aplicativo não as chama de desmatamento ou reflorestamento.

O seletor anual muda a camada de vegetação e o valor correspondente do cartão. Não altera o Censo 2022, a carta SGB 2015 ou a camada urbana de 2022. A tabela do cartão permite comparar os cinco anos e verificar a cobertura dos pixels.

Fonte primária: [MapBiomas, cobertura de 10 metros](https://brasil.mapbiomas.org/iniciativas-e-produtos/cobertura-e-uso-da-terra/cobertura-10m/cobertura/). A página atual pode apresentar coleções posteriores; os arquivos utilizados são os da coleção 2, explicitamente identificados pela procedência preservada.

## Vegetação recente com Sentinel-2

### Objetivo e alcance

Esta extensão foi processada em 3 de outubro de 2026 para acrescentar observações recentes e espacialmente detalhadas à classificação histórica MapBiomas. Usa reflectância de superfície Sentinel-2 L2A a 10 m e um índice espectral contínuo. Não é um inventário de árvores, uma medida de fração de copas ou uma classificação supervisionada validada em campo. O aumento de detalhe e a atualização temporal não demonstram, por si, aumento de acurácia. Não foi calculada matriz de confusão porque não há referência independente amostrada para este produto.

### Descoberta e escolha das cenas

O catálogo público [Earth Search, coleção Sentinel-2 C1 L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a) fornece os metadados STAC e os endereços dos arquivos COG públicos. A busca usa o envelope `[-43.411, -22.815, -43.329, -22.755]`, entre `2025-01-01T00:00:00Z` e `2026-10-03T00:00:00Z`, cobertura de nuvens do tile inferior a 50%, ordem decrescente de data e limite de 100 respostas. Foram retornadas 95 cenas nesta consulta. A data final é fixa para reproduzir este retrato, não uma atualização automática diária.

Dentro dessa busca, o processamento considera os 90 dias anteriores à cena mais recente. Percorre as datas da mais recente para a mais antiga e aceita as seis primeiras com pelo menos 90% do município livre das classes excluídas pela máscara descrita abaixo. O percentual de nuvens do tile inteiro apenas pré-filtra a busca; a decisão final usa o recorte municipal. A cena de 20/08/2026 foi examinada e recusada por apresentar 89,60% de pixels locais aceitos pela máscara.

| Data | Identificador da cena | Pixels municipais aceitos pela máscara |
| --- | --- | ---: |
| 01/10/2026 | S2A_T23KPQ_20261001T130754_L2A | 99,42% |
| 29/09/2026 | S2C_T23KPQ_20260929T130246_L2A | 99,92% |
| 19/09/2026 | S2C_T23KPQ_20260919T130636_L2A | 99,09% |
| 04/09/2026 | S2B_T23KPQ_20260904T130307_L2A | 96,47% |
| 30/08/2026 | S2C_T23KPQ_20260830T130330_L2A | 92,28% |
| 05/08/2026 | S2B_T23KPQ_20260805T130245_L2A | 100,00% |

### Recorte, máscara e cálculo

1. Baixar janelas retangulares dos COGs correspondentes ao município com margem de 100 m. Preservar os números digitais originais das bandas vermelha B04 e infravermelho próximo B08, a classificação de cena SCL e seus metadados. Registrar SHA-256, endereço do asset e limites do recorte. Não baixar os tiles inteiros.
2. Usar uma grade comum de 10 m em EPSG:32723, com origem ajustada a múltiplos de 10 m. As bandas B04 e B08 são nativas a 10 m e coincidem com a grade. A SCL, de 20 m, é alinhada por vizinho mais próximo. Esse alinhamento não cria informação de nuvens a 10 m.
3. Aceitar apenas SCL 4, 5 e 6, correspondentes a vegetação, superfícies não vegetadas e água. Excluir as demais classes, inclusive nuvens, sombras, pixels sem classificação e dados inválidos. Expandir a máscara inválida duas vezes com vizinhança 3 × 3, uma margem de 20 m por eixo, para reduzir bordas de nuvem. Ainda podem restar névoa, sombras ou erros da SCL.
4. Converter números digitais em reflectância com os parâmetros de cada asset STAC. Nas cenas usadas, `reflectância = DN × 0,0001 − 0,1`. Excluir DN zero e reflectâncias menores ou iguais a zero ou maiores que um. Aplicar o deslocamento antes do índice é necessário; calculá-lo diretamente sobre DN produziria valores diferentes.
5. Calcular por cena `NDVI = (B08 − B04) / (B08 + B04)`. Produzir a mediana temporal por pixel somente quando houver pelo menos três observações válidas. O resultado representa a janela de 05/08 a 01/10/2026, não uma imagem de um único dia.
6. Atribuir o pixel ao território que contém seu centro. Registrar separadamente o total de pixels, os pixels com observações suficientes, a cobertura percentual, a mediana do NDVI e os percentuais acima dos limiares. Somente publicar a mediana e os percentuais quando pelo menos 95% dos pixels do território tiverem três observações válidas. A cobertura permanece visível mesmo quando o indicador é suprimido.

Os pixels de 10 m frequentemente misturam telhados, pavimento, solo, sombra e vegetação. O índice responde a árvores, arbustos e gramíneas. Água, solo úmido e materiais urbanos também afetam a resposta espectral. Não se infere espécie, porte, propriedade, acesso público ou condição fitossanitária.

### Indicadores e sensibilidade

O denominador dos percentuais de sinal vegetal é o número de pixels com pelo menos três observações válidas, não toda a área administrativa. O numerador é o número desses pixels cuja mediana de NDVI alcança o limiar escolhido. Cada pixel participa integralmente dessa contagem. O percentual não representa a fração vegetada dentro dele.

| Medida municipal | Resultado |
| --- | ---: |
| Pixels municipais | 352.127 |
| Pixels com pelo menos três observações válidas | 351.943 |
| Pixels insuficientes | 184 |
| Cobertura de observações suficientes | 99,9477% |
| Mediana de NDVI nos pixels válidos | 0,1597 |
| Pixels válidos com NDVI ≥ 0,3 | 26,3764% |
| Pixels válidos com NDVI ≥ 0,4 | 17,8887% |
| Pixels válidos com NDVI ≥ 0,5 | 11,7559% |

O cartão destaca o limiar exploratório 0,4 e oferece 0,3 e 0,5 para revelar a sensibilidade da medida. Essa variação não é um intervalo de confiança. Nenhum limiar foi calibrado como fronteira universal entre vegetação e ausência de vegetação em Meriti.

Cinco setores não atingem a cobertura mínima de 95% e, por isso, ficam sem percentual e sem mediana de NDVI. São `330510905000444` (86,36%), `330510910000269` (88,06%), `330510905000013` (90,93%), `330510905000443` (91,61%) e `330510915000016` (93,30%). Todos os bairros superam 99,68%. Ausência de indicador nesses setores não significa ausência de vegetação.

Não comparar 17,89% de pixels com NDVI ≥ 0,4 em 2026 aos aproximadamente 0,18% de classes vegetais MapBiomas em 2023 como se fossem aumento de cobertura. As definições, métodos, períodos e respostas a pixels mistos são diferentes. A série anual continua exclusiva do MapBiomas; o Sentinel-2 recente permanece fixo ao mudar o ano.

### Apresentação no mapa e arquivos

A camada espectral destaca três faixas, de 0,3 a menos de 0,4, de 0,4 a menos de 0,5 e pelo menos 0,5. Valores abaixo de 0,3 ficam transparentes. Essa transparência não certifica ausência de vegetação. Pixels com observações insuficientes aparecem em cinza; fora do município não há sobreposição.

A camada opcional em cores naturais usa a cena de 05/08/2026, que teve a maior cobertura municipal aceita pela máscara, 100%. Ela não é a data mais recente do conjunto. Serve de referência visual a 10 m e fica abaixo das camadas analíticas. A imagem Esri de fundo permanece uma referência visual sem data municipal única e não entra nos cálculos.

Os GeoTIFFs de NDVI e de número de observações estão em `data/interim/meriti/`. O relatório `sentinel2-statistics.json` preserva resultados das 829 unidades e decisões de seleção. Para o navegador, imagens RGBA são reprojetadas por vizinho mais próximo para EPSG:3857; os quatro cantos em longitude/latitude constam do pacote da aplicação. O PNG não substitui o GeoTIFF como arquivo de análise. O tamanho de exibição, 867 × 679, não altera a resolução analítica de 10 m.

Referências de processamento [Earth Search](https://github.com/Element84/earth-search/blob/main/README.md) e [bandas e classificação de cena Sentinel-2 L2A](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html). Dados Copernicus Sentinel, acesso livre e aberto, distribuídos pelo Earth Search/Element 84.

## Investigação complementar da vegetação

### Medida principal e estado da validação

A medida solicitada para a pesquisa é a fração horizontal de toda a vegetação viva dentro do limite municipal, incluindo árvores, arbustos e vegetação herbácea. Copas de árvores, quando distinguíveis na referência, constituem um subconjunto. A data-alvo foi fixada em **01/10/2026**, antes da interpretação amostral. O composto Sentinel-2 de agosto a outubro serve para estratificar a amostra; não transforma a cobertura em média temporal. Os produtos abaixo ampliam a evidência disponível, mas ainda não fornecem uma estimativa validada dessa fração.

O protocolo registra 400 células sorteadas e zero rótulos de referência concluídos. Nenhuma previsão de NDVI, altura de copas ou MapBiomas foi usada como verdade para validar outra previsão. O percentual real e sua incerteza dependem de referência independente adequada e interpretação da amostra. A escolha dos métodos não depende de obter uma conclusão favorável ou contrária aos números publicados por outra fonte.

### CHMv2 e árvores dentro da classe urbana

Foi recuperado o [CHMv2 Meta/WRI](https://registry.opendata.aws/dataforgood-fb-forestsv2/), licença CC BY 4.0, por recorte remoto do tile `2112000120`. O modelo foi publicado em 2026. Os polígonos de data cobrem integralmente Meriti e indicam aquisição em **16/09/2019**. Portanto, esta camada é histórica. A grade nativa está em EPSG:3857, com 1,1943 m por pixel no sistema cartográfico, aproximadamente 1,1 m no terreno. Não é um levantamento LiDAR local.

A máscara original de validade foi preservada. Contam-se pixels com centro dentro da unidade territorial. A área física de cada linha foi calculada no elipsoide WGS84, evitando tratar metros de Web Mercator como área real. Foram aceitos 29.181.296 pixels municipais, com suporte de 3.521,5604 ha. Essa área de grade difere ligeiramente da área vetorial. Os limiares são inclusivos e os resultados usam a área válida como denominador.

| Altura estimada pelo modelo | Área, ha | Percentual do suporte válido |
| --- | ---: | ---: |
| Pelo menos 2 m | 510,4518 | 14,4950% |
| Pelo menos 3 m | 433,0002 | 12,2957% |
| Pelo menos 5 m | 314,0516 | 8,9180% |

Esses valores são candidatos a estrutura de copas estimados pelo modelo. Podem incluir falsos positivos em edifícios, sombras ou outras superfícies. Não foi aplicada uma máscara local independente de não vegetação. Altura zero ou inferior ao limiar não comprova ausência de vegetação rasteira, de árvores pequenas ou de valor ecológico. A comparação de limiares não é intervalo de confiança.

Para investigar o significado da classe urbana, o MapBiomas de **2019**, coleção 2 beta, foi reprojetado por vizinho mais próximo sobre a grade CHMv2. No suporte válido comum, 368,8438 ha dos candidatos com altura ≥3 m coincidem com a classe urbana 24. Isso corresponde a **85,1833% da área desses candidatos**, não a 85% da área urbana. Outros 2,6464 ha coincidem com as classes vegetais selecionadas e 61,5099 ha com as demais classes. Estas últimas incluem pastagem e mosaico de usos, portanto não são sinônimo de ausência de vegetação.

O cruzamento mostra diferença de representação entre dois produtos do mesmo ano. A classe urbana pode conter árvores e jardins; o modelo de altura também pode errar. O resultado não mede erro do MapBiomas nem comprova 433 ha de árvores reais. Não subtrair esse modelo histórico do NDVI recente para inferir perda ou ganho.

As estatísticas usam a grade nativa. O PNG de exibição foi reduzido por vizinho mais próximo para 3.883 × 3.062 pixels. A legenda e a geração da imagem compartilham as mesmas classes, de 2 a menos de 3 m, de 3 a menos de 5 m e pelo menos 5 m. Valores abaixo de 2 m ficam transparentes. O relatório `chmv2-statistics.json` inclui as 829 unidades e seis áreas protegidas.

### Recorrência espectral nos 12 meses de 2025

A consulta ao Earth Search preservou 57 cenas candidatas Sentinel-2 C1 L2A de 2025, com cobertura de nuvens do tile inferior a 50%. A completude foi conferida pelo número de identificadores únicos e pelo total informado pela API. Para cada mês, os candidatos são examinados da menor para a maior nebulosidade do tile. Calcula-se a máscara municipal; seleciona-se o melhor candidato examinado, interrompendo a busca quando ele alcança 98,5% de pixels localmente aceitos. Meses cujo melhor candidato não alcance 90% são rejeitados. Essa busca não promete encontrar a melhor cena de todo o mês.

Foram selecionadas as datas 17/01, 16/02, 03/03, 02/04, 17/05, 16/06, 16/07, 07/08, 09/09, 24/10, 05/11 e 23/12/2025. A cena de março conserva 92,01% de pixels válidos locais; as demais superam 98,5%. Escala e deslocamento vêm dos metadados de cada ativo. Mantêm-se as classes SCL 4, 5 e 6, com dilatação de 20 m das exclusões; valores brutos nulos e refletâncias fora de (0, 1] são excluídos. Usa-se a mesma grade UTM de 10 m do produto de 2026.

Um pixel é elegível quando tem seis observações válidas ou mais, incluindo pelo menos uma em cada trimestre. A frequência é o número de datas com NDVI ≥0,4 dividido pelo número de datas válidas selecionadas. A classe recorrente exige frequência ≥80%; a variável vai de 20% a menos de 80%. Abaixo de 20% o mapa fica transparente, sem certificar ausência de vegetação. Falta de observações aparece em cinza. Unidades com menos de 95% de cobertura elegível ficam sem os percentuais.

No município, 352.099 de 352.127 pixels são elegíveis, cobertura de **99,9920%**. O sinal recorrente ocupa **14,7762%** desse suporte, e o variável, **8,7521%**. A mediana anual supera 0,4 em 19,2230% do suporte elegível. Frequência entre aquisições não mede probabilidade, permanência ecológica, fração de copas ou fração interna de vegetação em cada pixel. Estações, gramíneas, poda, sombra e seleção de datas alteram o resultado. O relatório preserva também os candidatos examinados e as coberturas por cena.

### Referência visual INPE/CBERS-4A de abril de 2026

Foi obtido o [produto WPM PCA RGB321 de 26/04/2026, órbita/ponto 199/142](https://data.inpe.br/bdc/stac/v1/collections/CB4A-WPM-PCA-FUSED-1/items/CBERS4A_WPM_PCA_RGB321_20260426_199_142), licença CC BY 4.0. O produto funde informação pancromática nativa de **2 m** com bandas multiespectrais nativas de **8 m**. O detalhe visual não torna as bandas multiespectrais medições nativas de 2 m. O RGB fusionado de oito bits não é usado para calcular NDVI.

O recorte nativo preservado tem 4.303 × 3.328 pixels em EPSG:32723. A prévia foi reprojetada por vizinho mais próximo para 3 m em EPSG:3857, somente para exibição. Há dados em 99,998978% do suporte municipal amostrado. Essa presença não mede ausência de nuvens. A triagem visual de abril não mostrou obstrução conspícua na cidade, mas não produziu máscara quantitativa de nuvens.

A cena de 02/09/2026 foi descartada por nuvens e sombras, assim como a candidata de fevereiro. As prévias locais de janeiro e março não forneceram dados utilizáveis. A decisão e as consultas estão preservadas em `cbers4a-statistics.json` e na [investigação das fontes](meriti-vegetation-sources-research.md). Abril antecede a data-alvo de outubro. Sua utilização como referência exige avaliar estabilidade temporal e alinhamento; o simples fato de ser outro satélite não resolve essas diferenças.

### Amostra independente e estimativa futura

O desenho inclui todas as células de 10 m com interseção de área positiva no município, incluindo bordas. São 353.646 células na população amostral. O universo difere do conjunto de pixels com centro interno utilizado nos mapas, para que toda a área vetorial tenha probabilidade de inclusão. A unidade interpretada é a **célula inteira recortada**, não apenas o ponto do marcador.

Há dez estratos. Interseção de área positiva com unidade protegida tem precedência; depois vêm os pixels sem NDVI; os demais combinam faixas de NDVI com a classe urbana ou outras classes do MapBiomas 2023. A alocação reserva pelo menos 40 células para o estrato protegido e 20 para os demais, limitada pela população. O restante é distribuído pela maior razão N_h/(n_h+1), com desempate fixo. O sorteio é aleatório simples sem reposição em cada estrato, com semente `33051092026` e gerador NumPy PCG64. Pontos, polígonos, pesos e hashes estão preservados. Locais difíceis não podem ser substituídos silenciosamente.

A ficha cega omite estratos, previsões e pesos. Ela exige fração de vegetação viva, fonte, data, resolução, avaliadores e decisões sobre adequação, alinhamento e estabilidade temporal. Imagem diferente de 01/10/2026 só pode ser aceita com relatório rastreável de estabilidade na data-alvo. Mudança não resolvida fica ambígua e bloqueia a estimativa. A imagem CBERS de abril não recebe aprovação automática.

A estimativa da área é a soma, por estrato, de N_h multiplicado pela média amostral da área recortada vezes a fração interpretada. A variância usa correção de população finita para sorteio sem reposição. O intervalo normal de 95% corresponde à estimativa ±1,96 erros-padrão, sem truncar limites. Ele descreve incerteza amostral condicional à referência, não incorpora automaticamente erro de interpretação, deslocamento ou mudança temporal. A medida opcional de copas deve ser subconjunto da vegetação viva. Não há precisão observada ou intervalo final nesta entrega.

O [protocolo completo](meriti-vegetation-validation-plan.md) documenta treinamento, avaliação independente, impedimentos ao cálculo e comandos de estimação, com base nas [boas práticas de Olofsson et al. (2014)](https://www.sciencedirect.com/science/article/pii/S0034425714000704). O download público inclui a ficha atual e as 400 células. A amostra mestra com estratos e pesos fica separada da ficha de interpretação.

## Áreas protegidas, APAs e Parque Jardim Jurema

A expressão "ZAPAs" do pedido foi investigada sem ser adotada como categoria jurídica. O [cadastro de unidades municipais publicado pelo INEA](https://geoportal.inea.rj.gov.br/server/rest/services/Unidades_de_Conserva%C3%A7%C3%A3o/FeatureServer/11), ano cadastral 2024 e ICMS Ecológico 2025, traz seis unidades de São João de Meriti. São cinco áreas de proteção ambiental e um parque natural municipal. O [Atlas do INEA de 2025, páginas 134–135](https://www.inea.rj.gov.br/wp-content/uploads/2025/03/livro.pdf) e a [publicação municipal de 11/06/2026](https://transparencia.meriti.rj.gov.br/diario_oficial_get_anexo.php?codigo=10853) corroboram esse conjunto. O Atlas se refere a levantamentos anteriores à publicação; sua data não atualiza automaticamente os limites.

| Unidade cadastrada | Categoria | Área no cadastro, ha | Ato indicado pelo cadastro |
| --- | --- | ---: | --- |
| Limoeiro | APA | 10,0556 | Decreto 4.969, 20/04/2010 |
| Jardim Jurema | Parque natural municipal | 14,8205 | Decreto 4.220, 25/03/2004 |
| Parque Vitória | APA | 2,9065 | Decreto 4.969, 20/04/2010 |
| Aeronáutica | APA | 11,6367 | Decreto 4.969, 20/04/2010 |
| Andorinhas | APA | 16,2211 | Decreto 4.969, 20/04/2010 |
| Jardim Santo Antônio | APA | 3,5428 | Decreto 4.969, 20/04/2010 |

A consulta espacial usa o envelope `[-43.425, -22.83, -43.315, -22.74]`, retorna todos os atributos e geometrias em EPSG:4326, sem Z ou M. Das 12 unidades do entorno retornadas, seis têm o atributo `municipio = SAO JOAO DE MERITI`. Seus polígonos são válidos e ficam dentro do limite municipal. A área total declarada no cadastro é 59,1833 ha; a área calculada em EPSG:31983 é 59,1784 ha. As duas medidas têm origem distinta e não são substituídas uma pela outra.

O mapa usa os polígonos publicados. Cada marcador numerado é um ponto interno calculado sobre o polígono em EPSG:31983 e convertido para EPSG:4326. Esse método garante que o marcador pertença à área; ele não localiza entrada, sede ou acesso autorizado. Não houve desenho por aproximação no Google Maps. O popup informa categoria, área cadastral, ato indicado na fonte, método geométrico e endereço da fonte oficial.

Os atos são transcritos do cadastro, sem certificação jurídica individual de seus memoriais. Para delimitação fundiária, é necessário consultar os atos e levantamentos correspondentes. O cadastro não comprova conservação integral, visitação pública ou ausência de ocupação. A menção "não consta" no campo CNUC dessa versão não prova ausência atual no cadastro nacional. Horto e Boa Vista apareceram em referências de restauração, mas não foram promovidos como unidades adicionais sem correspondência neste conjunto oficial.

## Rios, canais e massas de água

Foram consultadas três camadas da BC25, base cartográfica em escala 1:25.000, edição 2018, produzida por IBGE/SEA e publicada pelo INEA. São [rede de drenagem, camada 84](https://geoportal.inea.rj.gov.br/server/rest/services/BC_25/FeatureServer/84), [canais, camada 89](https://geoportal.inea.rj.gov.br/server/rest/services/BC_25/FeatureServer/89) e [massas de água, camada 118](https://geoportal.inea.rj.gov.br/server/rest/services/BC_25/FeatureServer/118). A data de download em 2026 não torna esses traçados atuais.

A consulta usa o mesmo envelope da coleta de unidades de conservação, todos os atributos e geometrias em EPSG:4326. Foram recuperados 197 trechos de drenagem, 26 registros de canais e 11 massas de água no envelope. O recorte final usa o limite municipal com entorno de 500 m, calculado em EPSG:31983. Esse contexto é declarado na legenda e na procedência. Ele conserva rios de divisa que seriam cortados por pequenas diferenças entre a malha censitária e a cartografia hidrográfica. Trechos do entorno não são apresentados como estando integralmente dentro de Meriti.

Após o recorte, restam 127 registros de drenagem, 18 de canais e nove massas de água. Todos os traçados dos canais já estão contidos na rede de drenagem. Assim, os canais classificam trechos com pelo menos 99% de sobreposição geométrica, sem acrescentar linhas duplicadas. A camada 88, chamada canal/vala, também foi examinada e coincide geometricamente com a 89 neste recorte; foi preservada como fonte investigada e excluída da composição.

A própria camada de drenagem contém repetições, inclusive linhas de divisa atribuídas a municípios diferentes. As geometrias foram unidas por nome e categoria, preservando os identificadores originais em `sourceFeatureIds`. O resultado tem dez feições multipartes, oito grupos de cursos de água e dois de canais. Isso não significa dez rios. Cada feição pode reunir vários segmentos, inclusive os sem nome. A soma dos comprimentos resultantes coincide com a união geométrica, sem sobreposição linear residual na tolerância de 0,1 m da validação. A operação removeu 14.405,50 m de repetição. O comprimento final, 49.566,76 m, inclui o entorno de 500 m e não é um indicador de extensão exclusivamente municipal.

Os nomes preservados incluem Rio Pavuna, Canal de Sarapuí, Rio São João de Meriti, Rio Acari, Rio Dona Eugênia, Rio da Prata e Rio dos Cachorros. Feições sem nome permanecem identificadas como tal. As nove massas de água são polígonos da cartografia histórica, não delimitação de lâmina de água por satélite em 2026.

A rede não informa direção de escoamento validada, vazão, capacidade hidráulica, navegabilidade, limpeza, canalização subterrânea completa ou manutenção. A sobreposição com a carta SGB permite inspeção visual de fontes distintas; ela não constitui um modelo hidráulico e não recalcula a suscetibilidade de 2015. Nenhum caminho foi inventado entre trechos desconectados. A hidrografia OSM permanece opcional para comparação, com origem e data próprias.

## Contexto do OpenStreetMap

A consulta pelo código IBGE da área retornou zero elementos. Ela foi preservada e rejeitada, sem interpretar a resposta como ausência de equipamentos. A consulta pelo envelope municipal retornou 248 elementos. Após recorte pelo limite do IBGE, foram mantidos 166 registros, sendo 66 cursos de água, 26 equipamentos e 74 parques, jardins ou áreas recreativas cadastradas.

Áreas de equipamentos e espaços verdes são representadas por pontos internos, conforme indicado na legenda. A base é colaborativa e incompleta. Ela não demonstra domínio público, acesso público, disponibilidade para obra ou capacidade de drenagem. Licença ODbL; atribuição aos contribuidores do OpenStreetMap.

## Fontes complementares e lacunas

O catálogo registra 33 fontes, com 19 promovidas, 12 diferidas e duas rejeitadas. Foram investigados INEA, ANA/HidroWeb, Cemaden, SINISA, o plano municipal de saneamento de 2014, a base cartográfica SGB em MDB e o produto acadêmico CEM. As fontes ainda sem curadoria não aparecem como evidência principal. A consulta ANA preservada estava vazia. A primeira rota INEA consultada retornou HTTP 404; a investigação posterior encontrou os serviços operacionais usados nas camadas descritas acima. O erro anterior permanece registrado e não deve ser confundido com indisponibilidade de todo o INEA.

Foi localizada referência à estação de qualidade da água AC241, mas sem uma série com data de amostragem validada para esta entrega. Nenhum valor de qualidade da água foi promovido. A investigação suplementar, inclusive consultas sem resultado e fontes redundantes, está em `docs/methodology/meriti-protected-areas-research.md`. Nem todo documento consultado ou resposta redundante se torna uma linha promovida no catálogo.

## Informações na interface e exportação

Os ícones "i" exibem períodos, limites e condições de uso ao passar o mouse, receber foco por teclado ou tocar. Escape ou toque fora fecha a informação. Os avisos permanecem próximos ao indicador, sem asteriscos que exijam procurar uma nota distante. As observações metodológicas completas continuam disponíveis no cartão e neste documento, acessível pelo botão "Baixar metodologia detalhada".

Há 18 camadas disponíveis. Inicialmente ficam ativos o sinal vegetal recente, as áreas protegidas e os rios oficiais. As imagens Sentinel-2 e CBERS de referência são opcionais e ficam abaixo das evidências. CHMv2, recorrência mensal e amostra de conferência também são opcionais. O seletor anual controla exclusivamente MapBiomas. As fontes mantêm suas datas na legenda, nos ícones e na exportação.

A exportação JSON inclui a unidade selecionada, seus indicadores e a série histórica, observação Sentinel-2 da unidade com metadados de aquisição, áreas protegidas cadastradas, CHMv2 e recorrência da unidade, estado da validação, fontes e limitações. Não exporta uma pontuação, uma lista ordenada de prioridade ou uma recomendação de obra.

## Classes de solução

As regras usam observações, sem pontuação. Interseção com suscetibilidade média ou alta sugere investigar retenção e recuperação de margens. Predomínio de classe urbana igual ou superior a 90% sugere investigar jardins de chuva e biorretenção. Menos de 1% de manchas vegetais mapeadas sugere inventário de arborização e conexão de áreas verdes.

Esses limiares são regras exploratórias de comunicação, não limiares oficiais de risco, carência ou viabilidade. As regras não selecionam lotes e não recomendam uma obra pronta. Exigem vistoria, avaliação do solo, redes existentes, contaminação, situação fundiária e estudo hidráulico quando aplicável.

## Reprodução e verificação

1. Criar `.venv` no projeto e instalar `scripts/meriti/requirements.txt`.
2. Executar `scripts/meriti/collect.py` para as fontes públicas da primeira coleta e `scripts/meriti/collect_environment.py` para as fontes INEA suplementares. Fontes estaduais e nacionais preservadas ficam nos caminhos registrados pelo inventário original. Seus URLs permitem recuperar os arquivos faltantes. A coleta INEA confere os arquivos existentes pelo manifesto; se um arquivo faltar, repete a consulta registrada. Uma resposta cujo hash mudou é preservada separadamente como candidata e interrompe a reprodução para revisão, sem sobrescrever a evidência de origem.
3. Executar `npm run curate:meriti`. A sequência prepara territórios (`curate.py`), o Sentinel-2 de 2026 (`satellite.py`), as camadas INEA (`environment.py`), o CHMv2/CBERS (`supplemental_sources.py --source all`), o Sentinel-2 mensal de 2025 (`seasonality.py`) e o pacote (`build.py`). A coleta reutiliza arquivos conferidos e recupera recortes ausentes. As consultas têm janelas fixas; novas datas exigem nova curadoria. Serviços mutáveis podem devolver bytes diferentes dos preservados. A amostra registrada está versionada e não é sobrescrita pela curadoria. Para reproduzir seu sorteio em outra pasta dentro do projeto, usar `validation_sampling.py generate --output <pasta-nova>` e a mesma versão NumPy 2.2.6. O desenho original foi revisto antes da interpretação para fixar a data-alvo; os registros anteriores e os hashes da revisão permanecem preservados.
4. Executar `scripts/meriti/validate.py`. A validação confere população, códigos, topologia, recorte ou entorno declarado, cobertura, anos, proveniência, hashes e ausência de pontuação ou ranking. Confere também seis polígonos e seis pontos internos de unidades protegidas, ausência de repetição linear dos rios, densidade dos 809 setores, cenas distintas, grade Sentinel-2, pelo menos três observações, supressão de indicadores abaixo de 95% de cobertura e recálculo dos percentuais a partir do GeoTIFF. Verifica dimensões, transparência e legenda dos PNGs, data real do CHMv2, conservação de áreas entre divisões, 12 meses distintos, recálculo da recorrência, ausência de porcentagem de céu limpo no CBERS e integridade das 400 células. `npm run test:meriti-sampling` verifica o estimador, a rejeição de referências incompletas e os requisitos de estabilidade temporal.
5. Executar os testes da aplicação, a análise estática, o build e os testes de navegador.

Os dados curados de Meriti ficam isolados em `data/processed/meriti/`. Os produtos originais do Rio permanecem intactos. Os brutos grandes continuam fora do Git; os recortes intermediários, produtos curados, scripts e metadados são versionáveis. Nenhuma alteração precisa ser publicada no site original para executar Meriti localmente.

## Conferência independente e publicação de 03/10/2026

A nova rodada preserva as três fases. A coleta recuperou os agregados do entorno dos domicílios do Censo 2022 e uma cena CBERS-4A/WPM L4 de julho que não constava na coleção de RGB fusionado. A curadoria conferiu códigos, denominadores, supressões, geometrias das cenas, arquivos e datas reais de aquisição. A implementação publica os resultados como evidências separadas e disponibiliza uma página de conferência, sem pontuação composta e sem atribuir uma precisão não medida.

### Arborização observada em campo

A Pesquisa Urbanística do Entorno do IBGE registrou árvores nas faces de rua de 761 dos 806 setores com dados publicados. Os 16 bairros têm registros positivos. O universo municipal desta pesquisa contém 440.574 moradores, dos quais 219.493 vivem em faces com árvores, 49,8198%. Há 3.766 faces com árvores entre 9.683 faces pesquisadas, 38,8929%. Esses denominadores são os totais oficiais da pesquisa de entorno, incluindo quesitos saltados; não são a área municipal nem o total populacional de 440.962 pessoas.

O levantamento ocorreu entre 20/06/2022 e 28/05/2023 e foi divulgado em 17/04/2025. Considera árvores na face e no canteiro central, com porte acima de aproximadamente 1,70 m, inclusive podadas ou sem folhas. Não abrange toda vegetação viva nem delimita copas. A camada colore setores pelo percentual de moradores em faces com árvores. Três setores sem registro e um com moradores suprimidos permanecem sem valor. Ausência de registro positivo não significa ausência de vegetação no setor. Os agregados de bairro, distrito e município vêm diretamente das tabelas oficiais, sem reconstruir valores suprimidos por diferença.

Essa é evidência independente da presença histórica de árvores, não validação da área vegetal por pixel em outubro de 2026. O procedimento completo, variáveis, arquivos, reconciliações e limitações estão em [metodologia do levantamento de campo](/api/validacao/campo). Fonte primária [IBGE, características urbanísticas do entorno](https://biblioteca.ibge.gov.br/visualizacao/livros/liv102168.pdf).

### Adequação das imagens de referência

Foram consultados os catálogos WPM PCA, L4 e L2 de 2026, com conferência da cobertura geométrica de cada cena. A aquisição L4 de 02/07/2026 contém PAN de 2 m e bandas multiespectrais de 8 m, incluindo infravermelho. Foram preservados os valores digitais originais e preparados painéis cegos das 400 células. A galeria pública apresenta PAN, RGB e NIR-R-G separados, com estiramento p2–p98 por banda e ampliação pelo vizinho mais próximo. Não houve geração de detalhes, fusão, cálculo de NDVI com valores digitais não calibrados ou alteração da amostra.

A inspeção piloto de 16 células por IA encontrou presença provável em três e resultado indeterminado nas demais para o alvo de toda vegetação viva. Não foram atribuídas frações numéricas. O piloto não substitui dois intérpretes e não produz uma estimativa municipal. A comparação de 16 contextos de abril e julho encontrou translação relativa mediana de 2 m, máximo de 2,83 m. Esse diagnóstico não mede precisão absoluta nem aprova o registro. A referência de julho antecede em 91 dias a data-alvo de 01/10/2026 e não comprova estabilidade temporal.

Os metadados submétricos Esri consultados nas 400 células apontam aquisições de junho e dezembro de 2025, não imagens de 2026. Não houve coleta sistemática ou redistribuição dessas imagens. Os recortes publicados na galeria são exclusivamente CBERS aberto, com atribuição ao INPE e licença CC BY 4.0. A [auditoria das referências](/api/validacao/auditoria) registra consultas, recusas, hashes, piloto, diagnóstico de alinhamento e lacunas.

Continuam existindo zero frações aceitas no estimador registrado. Para concluir a porcentagem e sua incerteza, ainda são necessárias referência adequada para plantas pequenas, avaliação independente do registro, interpretação quantitativa e concordância entre revisores, além da correspondência temporal. A presença histórica do IBGE e as inferências espectrais permanecem visíveis, cada qual com sua definição.

### Entrega das imagens no site

Os arquivos cartográficos são preparados como recursos estáticos no build, a partir dos produtos curados e dos painéis cegos. Isso permite servir a imagem CBERS de aproximadamente 13 MB pela distribuição estática da hospedagem, sem passar o corpo por uma função com limite de 4,5 MB. A API de camadas mantém a lista autorizada e a validação do ano, redirecionando para os mesmos arquivos. Não há compressão com perda, redução da resolução científica ou mudança dos indicadores para atender à hospedagem.

## Bairros e localidades além da malha do Censo

A página A Cidade da Prefeitura cita 21 bairros e centros que correspondem a nomes de bairros, excluindo Shopping Grande Rio. Quinze correspondem à malha IBGE utilizada, incluindo a equivalência São Mateus/São Matheus. Seis nomes recebem novas referências de localização, sem redistribuir indicadores. Jardim Paraíso continua no mapa IBGE, embora ausente dessa lista municipal descritiva e não exaustiva.

O atlas escolar DAGEOP/UERJ-FFP oferece cinco contornos digitalizáveis, de Parque Alian, Parque Analândia, Parque Novo Rio, Parque Tietê e Vila Norma. Vila São João aparece apenas como rótulo e recebe um ponto aproximado. A criação do PDF em 05/11/2024 não estabelece a data dos limites. A georreferência usa as coordenadas impressas; as divisas aproximadas não constituem cadastro legal. Trechos encobertos pela Linha Vermelha em Parque Novo Rio e Parque Analândia foram interpolados e registrados por feição. A publicação recorta apenas a sobra externa à divisa municipal, mantendo os contornos originais intermediários.

As referências do atlas cruzam bairros IBGE. Não recebem população, densidade, saneamento ou vegetação calculada a partir de proporções de área. Os indicadores seguem ligados às unidades do Censo. A escolha de uma localidade mostra um cartão próprio com fonte e acesso explícito aos indicadores das unidades IBGE intersectadas.

O procedimento, controles, vértices, comparação de nomes, conferência de posicionamento e limitações estão em `docs/methodology/meriti-neighborhoods-research.md`, disponível em [metodologia dos bairros](https://meriti-nbs-explorer.vercel.app/api/bairros/metodologia). Fontes primárias: [Prefeitura](https://meriti.rj.gov.br/inicio/a-cidade/) e [atlas DAGEOP/UERJ](https://www.dageop.com.br/sao-joao-de-meriti).

## Rendimento dos responsáveis pelo domicílio — Censo 2022

Foram adicionados dois indicadores do IBGE: V06004, rendimento nominal médio mensal das pessoas responsáveis com rendimento por domicílios particulares permanentes ocupados, e V06006, rendimento nominal mediano mensal desse mesmo universo. A fonte é a edição dos agregados de rendimento revisada em 08/05/2026, incluindo seu dicionário: https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/ . O ano dos rendimentos é 2022; 2026 é a data de revisão da publicação. Os reais são nominais de 2022, sem correção por inflação.

A mediana descreve o valor central da distribuição; a média é sensível a rendimentos altos. Responsáveis sem rendimento não integram essas duas medidas. Não são renda domiciliar per capita, renda de todos os moradores, linhas de pobreza ou indicadores suficientes de vulnerabilidade. Não se deve inferir a renda de uma pessoa ou imóvel a partir da média do setor.

As quatro escalas usam seus próprios arquivos oficiais: município, três distritos, 16 bairros e setores. A junção é pelo código IBGE, sem interpolação espacial, cálculo de médias de medianas ou atribuição dos dados municipais a bairros. Localidades aproximadas do atlas continuam sem indicadores próprios. O mapa mantém 809 polígonos setoriais: 805 têm média e mediana publicadas, dois têm valores suprimidos como X e dois não têm registro no arquivo de rendimento. Os quatro casos ficam nulos e cinza, nunca zero. O cartão apresenta o agregado oficial da unidade territorial selecionada; selecionar Setores permite consultar os valores setoriais.

São João de Meriti tem renda média de R$ 1.893,05 e mediana de R$ 1.300,00 nesse universo. As faixas de cor, comuns aos dois mapas, usam os cortes R$ 1.000, R$ 1.500, R$ 2.000, R$ 3.000 e R$ 5.000; foram escolhidas para visualização, sem classificação oficial de pobreza. A barra de anos da vegetação não modifica os dados de renda.

A coleta, a junção e a publicação podem ser reproduzidas com `.venv/bin/python scripts/meriti/income.py`. Os arquivos nacionais originais e recibos de integridade estão em `data/raw/meriti/ibge__renda_responsavel__2022/`; a proveniência e a cobertura do recorte estão em `data/processed/meriti/metadata/income-report.json`. O processamento principal em `scripts/meriti/build.py` também incorpora esses indicadores.
