# Fontes adicionais de vegetação e imagem de referência de Meriti

Pesquisa e extração em 3 de outubro de 2026. Município IBGE 3305109. O objetivo é medir evidências de vegetação sem confundir uma classe de uso do solo com ausência de árvores. Os resultados abaixo são derivados reproduzíveis, ainda sem uma avaliação de acurácia local independente.

## O que foi adquirido

| Produto | Data da observação em Meriti | Uso imediato | Restrição principal |
| --- | --- | --- | --- |
| INPE CBERS-4A/WPM RGB fusionado PCA | 26/04/2026 | Imagem de referência de 2 m para inspeção e futura interpretação amostral | RGB fusionado, sem infravermelho nem máscara de nuvens por pixel |
| Meta/WRI CHMv2 | 16/09/2019 | Altura modelada de copas na escala de aproximadamente 1,1 m no solo local | Modelo histórico, sem validação local de presença de árvores |

São duas fontes diferentes dos dados espectrais Sentinel-2 já usados no projeto. Essa diferença permite comparação e planejamento da validação. Ela não transforma automaticamente nenhuma das fontes em verdade de campo.

## Imagem CBERS recente

O INPE distribui uma coleção RGB de 2 m produzida por fusão PCA de imagens CBERS-4A/WPM. A coleção informa valores de 1 a 255, reservando zero para ausência de dados, e licença CC-BY-4.0. A extração usa o [catálogo primário da coleção](https://data.inpe.br/bdc/stac/v1/collections/CB4A-WPM-PCA-FUSED-1). O [anúncio técnico do INPE](https://data.inpe.br/nova-colecao-de-imagens-fusionadas-de-alta-resolucao-espacial-do-satelite-sensor-cbers-4a-wpm/) identifica o processo PCA e a resolução espacial.

A consulta STAC usou o envelope `[-43.411, -22.815, -43.329, -22.755]`, período de 01/01/2025 a 03/10/2026 e limite de 100 itens. A resposta informa 15 itens encontrados e 15 retornados. O resultado integral e a consulta estão preservados na proveniência. Foram examinadas as cinco candidatas de 2026 por prévias locais, sem estimar uma fração de nuvens a partir apenas da aparência da imagem.

| Cena examinada | Decisão | Evidência da decisão |
| --- | --- | --- |
| 02/09/2026 | Rejeitada como referência principal | Nuvens e sombras de nuvens obstruem extensas partes do município |
| 26/04/2026 | Selecionada | Ausência de obstrução conspícua por nuvens na prévia local; névoa e sombras finas não foram quantificadas |
| 31/03/2026 | Rejeitada | A prévia local retornou sem valores RGB válidos |
| 23/02/2026 | Rejeitada | Nuvens e sombras de nuvens obstruem extensas partes do município |
| 28/01/2026 | Rejeitada | A prévia local retornou sem valores RGB válidos |

A cena escolhida é [`CBERS4A_WPM_PCA_RGB321_20260426_199_142`](https://data.inpe.br/bdc/stac/v1/collections/CB4A-WPM-PCA-FUSED-1/items/CBERS4A_WPM_PCA_RGB321_20260426_199_142). A seleção foi feita pela legibilidade da superfície, antes de qualquer rotulação de vegetação. A cena de setembro também foi baixada e preservada, permitindo auditar sua rejeição.

O recorte mantém a grade original EPSG:32723, WGS84/UTM 23S, com 2 × 2 m, 4.303 colunas e 3.328 linhas. O GeoTIFF tem três bandas RGB, números digitais originais e 30.139.007 bytes. O acesso usou leitura parcial do COG; o mosaico regional de vários gigabytes não foi baixado integralmente.

Nos centros de pixels dentro do limite municipal, 99,998978% têm valores diferentes de zero em todas as bandas. Esse número mede presença de dados. **Não mede ausência de nuvens.** O relatório deixa `cloudFreePct` nulo e `dataPresenceIsCloudFree` falso. Não há ativo de classificação de nuvens no item selecionado.

A prévia do site tem 3.137 × 2.454 pixels, grade de 3 m em EPSG:3857 e reamostragem pelo vizinho mais próximo. Preserva o RGB publicado, sem correção de cor própria, e aplica transparência fora do município ou onde há ausência de dados. As coordenadas dos quatro cantos constam no relatório. A imagem nativa de 2 m continua disponível para interpretação e auditoria.

O produto fusionado não é reflectância de superfície e não contém NIR. Não se calcula NDVI a partir dele. Seu papel é permitir examinar árvores, gramados, telhados, sombras e bordas na imagem de outro sensor. Para uma amostra destinada à avaliação, os intérpretes devem trabalhar sem conhecer a classe prevista pelo NDVI ou CHMv2. Abril e agosto/outubro de 2026 são períodos diferentes; mudanças, fenologia, sombra e qualquer ambiguidade devem ser registrados, sem forçar um rótulo.

## Altura modelada de copas CHMv2

O [registro primário Meta/WRI na AWS](https://registry.opendata.aws/dataforgood-fb-forestsv2/) oferece COGs e polígonos das datas de aquisição sob CC-BY-4.0. O [notebook oficial](https://github.com/facebookresearch/dinov3/blob/main/notebooks/chmv2_dataset_exploration.ipynb) descreve a banda como altura do topo da copa acima do solo em metros, a máscara interna de validade associada a nuvens, o CRS EPSG:3857 e os blocos nomeados por quadkey de nível 10.

O [artigo dos autores](https://arxiv.org/html/2603.06382v1) apresenta um modelo DINOv3 treinado com LiDAR, aplicado a imagens ópticas Vantor/Maxar. O modelo foi publicado em 2026, mas o mosaico de entrada é histórico. Os autores apontam limitações de datas, nuvens residuais, sombras, deslocamento em tomadas oblíquas e distribuição desigual dos dados de treinamento. Recomendam uma máscara independente de áreas não vegetadas ao calcular estatísticas de copas. Uma avaliação global não fornece automaticamente a acurácia de São João de Meriti.

Meriti está inteiramente no tile `2112000120`. O recorte foi obtido de [seu COG](https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/dinov3_global_chm_v2_ml3/chm/2112000120.tif), mantendo valores uint8 e máscara interna. A interseção dos [polígonos oficiais de data](https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/dinov3_global_chm_v2_ml3/metadata/2112000120.geojson) com o município encontrou uma única aquisição, **16/09/2019**. O produto não pode ser apresentado como cobertura arbórea observada em 2026.

O GeoTIFF local tem 7.765 × 6.123 pixels e 4.124.103 bytes. O passo da grade é 1,1943285669558747 m em Web Mercator. Isso não equivale a 1,1943 m no solo. A área elipsoidal local de cada pixel varia aproximadamente de 1,2063 a 1,2073 m². A dimensão terrestre equivalente fica perto de 1,10 m. A resolução nominal não demonstra exatidão planimétrica de um metro.

### Estatística na grade nativa

Os polígonos IBGE 2022 foram transformados para o CRS do raster. A inclusão de um pixel exige que seu centro esteja no território; não se usa `all_touched`. A máscara original é mantida e uma altura zero é tratada como valor observado do modelo, não como ausência de dados.

A área é calculada no elipsoide WGS84 para os quatro cantos de um pixel em cada linha. Todos os pixels da linha têm a mesma área, por simetria longitudinal. A soma ponderada evita computar hectares diretamente em Web Mercator. Não se reamostra o raster de alturas antes de calcular as estatísticas.

Para cada território são contados pixels totais e válidos. Áreas e percentuais de candidatos a copas são calculados separadamente para altura modelada maior ou igual a 2, 3 e 5 m. A regra mínima de cobertura é 95%; abaixo disso, os percentuais ficam ausentes. O recorte atual tem 100% dos pixels municipais válidos na máscara do fornecedor. Essa validade não prova acerto da classificação nem ausência de artefatos.

Foram processados o município, os 16 bairros, os 3 distritos, os 809 setores e os seis polígonos de unidades de conservação do INEA. As UCs usam o cadastro 2024/ICMS 2025 sobre a imagem de 2019. O cruzamento caracteriza os polígonos atuais no registro histórico, não certifica sua situação fundiária ou ambiental naquela data.

| Limiar de altura modelada | Área candidata no município | Fração da área válida |
| --- | ---: | ---: |
| ≥ 2 m | 510,45 ha | 14,50% |
| ≥ 3 m | 433,00 ha | 12,30% |
| ≥ 5 m | 314,05 ha | 8,92% |

Esses limiares foram mantidos como análise de sensibilidade, sem ajuste para maximizar a cobertura. A diferença entre os resultados não é intervalo de confiança. Não foi aplicada uma máscara independente de edificações ou de outras superfícies. Por isso, os resultados são denominados **área com altura modelada compatível com copas**, sujeita a falsos positivos e falsos negativos. Uma construção, sombra ou artefato pode produzir sinal espúrio; plantas baixas e árvores pequenas podem ficar fora dos limiares. Nenhum valor zero autoriza inferir ausência de valor ecológico.

A área municipal representada pelos centros de pixels soma 3.521,560410 ha. A área geodésica do polígono é 3.521,555888 ha. A diferença de 0,004522 ha decorre da discretização da borda e não foi escondida por normalização para coincidir com o polígono. Os três distritos, os 16 bairros e os 809 setores conservam exatamente os 29.181.296 pixels municipais ao serem somados separadamente. A soma das áreas com altura ≥ 3 m difere do município apenas pelos arredondamentos gravados, menos de 0,00001 ha.

### Comparação de representação com MapBiomas 2019

O recorte MapBiomas de 2019 já preservado no projeto foi reamostrado pelo vizinho mais próximo para a grade nativa do CHMv2. A comparação usa somente pixels válidos nos dois produtos. O ano foi mantido em 2019 para reduzir a diferença temporal, mas um mapa anual e uma imagem de um único dia ainda não são observações simultâneas.

As classes foram agrupadas em área urbanizada, código 24; as classes vegetais previamente definidas no projeto, códigos 3, 4, 5, 9, 11, 12, 32, 49 e 50; e outras classes. O limiar de altura de 3 m é aplicado ao CHMv2, sem alterar a classe MapBiomas.

| Classe MapBiomas no local do candidato CHMv2 ≥ 3 m | Área de interseção | Fração dos candidatos CHMv2 |
| --- | ---: | ---: |
| Área urbanizada, código 24 | 368,84 ha | 85,18% |
| Classes vegetais definidas no projeto | 2,65 ha | 0,61% |
| Outras classes | 61,51 ha | 14,21% |

Esse cruzamento mostra que a maior parte do sinal estrutural do modelo aparece dentro de pixels rotulados como urbanos. Não demonstra que todo esse sinal é árvore, nem que o MapBiomas está errado. Um pixel urbanizado pode conter árvores de rua e quintais porque classe predominante de uso do solo e cobertura de copas são objetos de medição distintos. MapBiomas é uma iniciativa colaborativa; esta nota não o trata como inventário municipal de árvores.

Não se subtrai esse resultado da estimativa NDVI de 2026 para inferir desmatamento ou regeneração. As datas, resoluções, sensores e variáveis medidas são diferentes.

### Prévia da camada de copas

A imagem nativa de visualização preservada tem 7.765 × 6.123 pixels. A prévia para WebGL tem 3.883 × 3.062, com vizinho mais próximo, evitando exceder 4.096 pixels em qualquer dimensão. A visualização reduzida pode deixar de exibir pequenas feições; não participa das estatísticas.

As cores representam 2 a menos de 3 m, 3 a menos de 5 m e pelo menos 5 m. Pixels abaixo de 2 m ficam transparentes. Essa transparência não equivale a ausência de vegetação. Pixels inválidos, se presentes, recebem cinza. As estatísticas e o GeoTIFF analítico permanecem na grade original.

## Outras fontes examinadas

As ortofotos oficiais RJ-25 são um possível registro histórico independente. Os [metadados do IBGE](https://geoftp.ibge.gov.br/imagens_do_territorio/imagens_corrigidas/ortomosaicos/rj25/informacoes_tecnicas/Metadados-ORTOFOTO-RJ25.pdf) informam mosaicos finais de 1 m, SIRGAS2000/UTM e ajustamento da aerotriangulação entre 3 e 7 m. O [quadro de voos por bloco](https://geoftp.ibge.gov.br/imagens_do_territorio/imagens_corrigidas/ortomosaicos/rj25/informacoes_tecnicas/quadro%20de%20datas%20dos%20voos%20por%20bloco.pdf) mostra datas antigas e distintas. Não se identificou nesta etapa uma ortofoto municipal recente com resolução superior à CBERS e data comprovada. Os arquivos RJ-25 não foram promovidos a referência contemporânea.

WorldCover, mapas de altura baseados em Sentinel-2 e classificações adicionais de Sentinel-2 podem ajudar em comparações de modelos. Não são sensores independentes para avaliar o próprio sinal espectral Sentinel-2. Acrescentar muitas versões do mesmo sensor não substitui referência de validação. Não foram usados para compor uma pontuação.

## Reprodução e arquivos

O script `scripts/meriti/supplemental_sources.py` aceita `--source chm`, `--source cbers` ou `--source all`. Requer o ambiente geoespacial já usado pelo projeto. As operações usam os limites curados do IBGE e mantêm todos os arquivos dentro do workspace.

| Saída | Conteúdo |
| --- | --- |
| `data/raw/meriti/meta_wri__canopy_height_v2__2026/` | COG recortado, metadados de data, recibo de recorte, URLs e hashes SHA-256 |
| `data/interim/meriti/chmv2-statistics.json` | 829 observações territoriais, seis UCs, limiares, comparação MapBiomas, resolução, datas, imagem e limitações |
| `data/interim/meriti/chmv2-imagery-dates.geojson` | Datas do mosaico recortadas pelo limite municipal |
| `data/interim/meriti/chmv2-canopy-height-preview.png` | Camada de altura modelada com transparência e dimensões compatíveis com WebGL |
| `data/raw/meriti/inpe__cbers4a_wpm_rgb__20260426/` | RGB nativo de 2 m, item STAC, coleção, consulta, recibo e hashes |
| `data/interim/meriti/cbers4a-statistics.json` | Data, resolução, origem, licença, triagem visual, presença de pixels e coordenadas da prévia |
| `data/interim/meriti/cbers4a-rgb-20260426.png` | Imagem RGB de referência com transparência municipal |

Foram conferidos os hashes dos insumos, a conservação de pixels e áreas entre recortes administrativos, a ordem monotônica dos três limiares, a soma das classes do cruzamento, os quatro canais das imagens, a transparência e as dimensões máximas das prévias. Esses testes verificam o processamento. A avaliação da acurácia da cobertura vegetal permanece uma tarefa distinta, dependente de amostra de referência e protocolo de interpretação.
