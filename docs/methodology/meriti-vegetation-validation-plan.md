# Protocolo de cobertura vegetal viva e validação independente de Meriti

Versão de 3 de outubro de 2026. Este documento complementa `meriti.md`. Registra a definição solicitada pelo pesquisador, o desenho amostral já executado e as etapas ainda necessárias para estimar área vegetal com incerteza amostral. Nenhuma referência humana foi preenchida nesta entrega. Não há percentual de acurácia nem intervalo de confiança observado para a cobertura vegetal.

## O que será medido

A medida principal será a área da projeção horizontal de vegetação viva em **01/10/2026** dentro do limite municipal, dividida pela área desse limite. Essa data corresponde à aquisição Sentinel-2 mais recente do composto usado para estratificar a amostra. O estimando é a fração física nessa data, não uma média, máximo ou mediana da cobertura real entre agosto e outubro. Inclui árvores, palmeiras, arbustos, gramíneas, plantas de quintais, jardins, terrenos e coberturas de edifícios, independentemente de serem nativas, exóticas, espontâneas, públicas ou privadas. Vegetação aquática emergente ou flutuante identificável pode ser incluída; água com resposta espectral elevada não será automaticamente classificada como vegetação. A classificação não pretende identificar biomassa de algas ou organismos microscópicos.

A data foi explicitada em 03/10/2026, antes de qualquer anotação de referência. `target-date-amendment.json` registra a revisão e os hashes. O desenho anterior foi preservado em `sampling-design-before-target-date.json`; o atual registra `estimandDate=2026-10-01` e separa `stratificationImagePeriod`, de 05/08 a 01/10/2026. A revisão não alterou nenhum dos 400 locais, polígonos, probabilidades ou pesos.

A referência deve reconhecer vegetação viva temporariamente sem folhas ou pouco verde quando imagens próximas e/ou vistoria sustentarem essa interpretação. Se a vitalidade não puder ser resolvida, a resposta permanece ambígua. NDVI baixo não transforma vegetação dormente em superfície sem vegetação. Madeira morta, material artificial verde, solo exposto, água aberta e sombra sem objeto identificável não recebem área vegetal por suposição.

A cobertura de copas em 01/10/2026 será uma medida secundária. Uma copa sobre gramíneas conta uma vez na vegetação total, e sua projeção pode compor a parcela arbórea. Essa parcela não pode superar a cobertura vegetal total. Árvores e palmeiras devem ser distinguíveis da vegetação baixa pela referência; não se inferem altura, espécie ou número de indivíduos pelo NDVI. Vegetação viva cuja forma não possa ser identificada continua contribuindo para a medida principal. Seu tipo permanece desconhecido.

Esse objeto difere de floresta, vegetação nativa, uso do solo urbano, superfície permeável e situação jurídica de proteção. Um jardim pequeno pode ser vegetação viva sem ser classe florestal. Um polígono protegido pode conter pavimento. A resposta espectral não concede nem retira proteção legal. O estudo quantifica evidência física e documenta essas distinções, sem pressupor qual percentual confirmará a hipótese de pesquisa.

## O que o produto atual permite afirmar

O composto de seis cenas Sentinel-2 L2A entre 05/08 e 01/10/2026 registra sinal espectral associado à vegetação. Os 17,8887% referem-se a pixels válidos cuja mediana de NDVI é pelo menos 0,4. Um pixel de 10 m pode conter simultaneamente copa, telhado e rua. Contá-lo inteiro como vegetação não estima a fração vegetada, enquanto descartá-lo inteiro pode omitir árvores pequenas.

Os resultados com limiares 0,3, 0,4 e 0,5 são análises de sensibilidade do algoritmo. Não são três estimativas independentes, não medem erro e não formam intervalo de confiança. O percentual MapBiomas de classes vegetais também responde a outra definição. Nenhum contraste entre esses números pode ser chamado de aumento da vegetação ou prova de erro oficial sem harmonizar objeto, período e referência.

## Melhorias espectrais executáveis

A documentação Copernicus identifica B02, B03, B04 e B08 como bandas de 10 m; bandas red edge e SWIR são de 20 m. A resolução das bandas auxiliares limita o detalhe dos índices que as utilizam. Reamostrar SWIR para uma grade de 10 m não cria observações a 10 m. Usar os parâmetros de escala e deslocamento do asset antes dos cálculos, preservar cenas, máscaras e contagens válidas. [Documentação Sentinel-2](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L1C.html), [produto L2A](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html).

| Medida | Cálculo com reflectância | Uso a investigar | Limitação |
| --- | --- | --- | --- |
| NDVI | `(B08 − B04) / (B08 + B04)` | Intensidade e persistência do contraste entre infravermelho e vermelho | Resposta de pixel misto, sombras e materiais urbanos; não mede fração automaticamente |
| EVI2 | `2,5 × (B08 − B04) / (B08 + 2,4 × B04 + 1)` | Contraste adicional com as mesmas bandas de 10 m | Não é referência independente e precisa de reflectância física, não DN |
| NDMI | `(B08 − B11) / (B08 + B11)` | Umidade e contraste NIR/SWIR; inspeção de diferenças entre telhados, solo e vegetação | B11 nativa a 20 m; solo úmido e sombra também interferem |
| NDWI de água aberta | `(B03 − B08) / (B03 + B08)` | Identificar locais que merecem checagem como água | Água turva, mistura e sombra impedem usar um limiar universal |
| Persistência temporal | `número de cenas válidas acima do limiar / número de cenas válidas` | Separar sinal recorrente de episódios isolados | Mede repetibilidade do sinal, não probabilidade de estar correto |
| Dispersão temporal | Mediana, quartis e amplitude dos índices por pixel | Localizar mudança, sazonalidade ou observações instáveis | Uma mudança física real também aumenta a dispersão |

O EVI2 deriva do estudo de Jiang e colegas, que desenvolveu uma alternativa de duas bandas ao EVI. A equação não é uma conversão em percentual de área. [Jiang et al., 2008](https://vip.arizona.edu/documents/dataviewer/EVI2_Paper_Huete.pdf).

O USGS define NDMI pelo contraste NIR/SWIR. Chamá-lo de NDMI evita confundi-lo com o NDWI para água aberta. Na implementação Sentinel-2 proposta, B11 fornece o SWIR; isso não reproduz exatamente o índice de Gao com banda de 1,24 μm. [USGS, NDMI](https://www.usgs.gov/landsat-missions/normalized-difference-moisture-index), [USGS, terminologia NIR/SWIR](https://www.usgs.gov/publications/terminology-spectral-vegetation-index-nir-swirnir-swir).

Esses índices podem produzir mapas de concordância, divergência e candidatos para interpretação. Não se deve intersectar vários limiares arbitrários e chamar o conjunto resultante de vegetação validada. Essa operação pode reduzir falsos positivos e, ao mesmo tempo, omitir gramíneas secas ou árvores em sombra. As regras devem ser calibradas em dados separados dos usados para a avaliação final.

Uma extensão temporal deve preservar janelas comparáveis, cobertura de nuvens, número de observações e data de cada imagem. Juntar as datas de maior verdor de um ano produziria um máximo sazonal, e não cobertura em uma data. O composto de agosto a outubro de 2026 é um insumo multitemporal de sinal espectral e estratificação. Ele não define uma fração vegetal média verdadeira para esse período. Observações de 2025 ou de outras estações são contexto temporal, não rótulos intercambiáveis para o estimando de 01/10/2026.

## Referência necessária e independência

A avaliação requer observações de qualidade superior ao mapa avaliado para o objeto pretendido, com data e procedência conhecidas. A preferência de planejamento é por imagens ortorretificadas de resolução de 1 m ou melhor, pertinentes à data alvo, para examinar misturas dentro de células de 10 m. Isso não é um limiar universal de aceitação. Mesmo uma imagem de 0,5 m pode ser inadequada por data, nuvem, sombra ou deslocamento. A adequação precisa ser demonstrada no piloto e registrada para a fração que se pretende estimar. Fotografias de campo ajudam a resolver vitalidade, forma de vegetação e ambiguidades, mas uma fotografia oblíqua isolada não fornece automaticamente a fração horizontal.

Amostragem probabilística, referência mais confiável que o mapa, análise compatível com o desenho e registro do erro da própria referência são recomendações das boas práticas de avaliação. Acurácia global isolada pode ocultar omissões de uma classe pequena. [Olofsson et al., 2014](https://www.sciencedirect.com/science/article/pii/S0034425714000704).

A cor natural do mesmo Sentinel-2, índices derivados das mesmas bandas, Dynamic World ou classificações treinadas nessas imagens não constituem referência independente de maior resolução para essa finalidade. Concordância entre produtos pode apontar prioridades de investigação, sem certificar exatidão. Um mosaico de navegador sem data local verificável serve à navegação; não deve receber uma data única inventada. É preciso registrar a fonte, a data real de aquisição e as condições de uso da imagem interpretada.

O plano não pressupõe que uma imagem recente de resolução submétrica já esteja disponível. A aquisição dessa referência e sua interpretação continuam pendentes. Uma imagem adquirida exatamente em 01/10/2026 recebe avaliação temporal `same_date`; isso não elimina os demais requisitos de qualidade. Qualquer outra data, mesmo um dia antes ou depois, exige decisão `stable_at_target` acompanhada de relatório rastreável de estabilidade da fração até a data alvo. Não há tolerância automática de 15 dias ou outro intervalo.

O relatório deve identificar as aquisições ou observações usadas, o método de comparação, a célula avaliada e a evidência que sustenta a estabilidade da fração em 01/10/2026. Ausência de mudança detectável em imagem grosseira não comprova estabilidade de uma pequena copa. Desmatamento, poda, crescimento, obra, sazonalidade ou qualquer diferença não resolvida mantêm `temporal_stability_assessment=ambiguous` ou `changed_unresolved` e a unidade sem referência final. Não converter um estado anterior em fração atual sem evidência. Essa unidade não poderá ser retirada silenciosamente da análise, e a calculadora não aceitará esse estado.

### Imagens CBERS-4A em triagem

A coleta complementar examinou uma imagem CBERS-4A/WPM de 02/09/2026, rejeitada na triagem por nuvens, e procura outras datas. A cena de 26/04/2026 pode servir à comparação visual, mas não valida automaticamente a cobertura de outubro. Sem observações que sustentem a estabilidade até 01/10/2026, permanece temporalmente inadequada como referência para esse estimando. Uma cena candidata não se torna referência apenas por cobrir geograficamente o município. A aceitação deve usar seus metadados e recorte preservados, seguida de inspeção da cobertura municipal. O sensor é diferente do Sentinel-2, mas essa independência não demonstra, sozinha, qualidade suficiente como referência.

O INPE informa resolução nativa de 2 m na banda pancromática WPM e 8 m nas bandas multiespectrais. O produto RGB fusionado por PCA tem grade de 2 m, valores de visualização de 1 a 255 e zero reservado a ausência de dado. Portanto, sua cor não é reflectância multiespectral medida originalmente a 2 m. Não calcular NDVI a partir desse RGB, nem usar o tamanho de pixel como prova de resolução temática de pequenas copas. [INPE, câmeras](https://www.gov.br/inpe/pt-br/programas/cbers/sobre-o-cbers-1/cbers-04a/cameras-imageadoras), [INPE, produto fusionado](https://data.inpe.br/dados/cbers-4a/).

A inspeção deve registrar nuvens, sombras, saturação, manchas de ausência de dados e nitidez de alvos pequenos em diferentes partes do município. Selecionar, como planejamento, pelo menos 20 pontos de controle estáveis distribuídos pela cidade, por exemplo cruzamentos e cantos de estruturas. Se houver ajuste geométrico, reservar pelo menos dez pontos distintos para avaliar os resíduos sem reutilizar os pontos do ajuste. Publicar deslocamentos por ponto, viés por eixo e RMSE. Repetir a avaliação de uma amostra piloto com pequenos deslocamentos registrados ajuda a medir quanto a interpretação depende do alinhamento.

Essas quantidades são regras de planejamento deste estudo. Não constituem uma certificação de registro já realizada. O CBERS pode auxiliar a leitura de manchas, a verificação temporal e a identificação de discordâncias. Usá-lo como referência para frações exige demonstrar, em estudo piloto e avaliação de alinhamento, que a interpretação resolve a mistura urbana pretendida. Se pequenas copas ou frações não forem resolvidas, permanece inadequado para essa finalidade, mesmo que sirva à visualização de manchas maiores. A calculadora exige uma decisão documentada de adequação, com relatório piloto e avaliação de alinhamento; não aprova ou rejeita uma fonte apenas por sua resolução nominal.

## Amostra probabilística já gerada

`scripts/meriti/validation_sampling.py generate` sorteou 400 células, sem reposição dentro de cada estrato, com gerador PCG64 e semente `33051092026`. As células seguem a grade nativa Sentinel-2 de 10 m em EPSG:32723. A unidade amostral é a interseção da célula com o polígono municipal, incluindo fragmentos de borda. O ponto no GeoJSON é apenas uma localização interna para navegação. O intérprete deve avaliar todo o polígono recortado da célula.

O quadro tem 353.646 unidades e conserva 35.211.892,8793 m² do limite municipal nessa projeção, com diferença inferior a 0,01 m² entre soma das células recortadas e área do polígono. Ele difere do conjunto de 352.127 pixels selecionados pelo centro para os indicadores espectrais. A diferença impede excluir parte do município apenas porque o centro de uma célula ficou fora do limite.

Os estratos são mutuamente exclusivos e seguem esta ordem. Qualquer célula com interseção de área positiva em uma unidade protegida entra primeiro no estrato `protected`. Fora dele, células sem NDVI válido entram em `missing`. As demais são divididas em quatro faixas de NDVI e cruzadas com classe urbana 24 do MapBiomas 2023, ou outras classes. O MapBiomas só auxilia o sorteio; seu rótulo não determina a verdade de 2026.

| Estrato | Células na população | Células sorteadas |
| --- | ---: | ---: |
| Sem NDVI válido, fora do estrato protegido | 1.703 | 20 |
| Outras classes 2023, NDVI < 0,3 | 878 | 20 |
| Outras classes 2023, 0,3 ≤ NDVI < 0,4 | 191 | 20 |
| Outras classes 2023, 0,4 ≤ NDVI < 0,5 | 289 | 20 |
| Outras classes 2023, NDVI ≥ 0,5 | 4.806 | 20 |
| Células que intersectam unidades protegidas | 6.507 | 40 |
| Classe urbana 2023, NDVI < 0,3 | 258.129 | 195 |
| Classe urbana 2023, 0,3 ≤ NDVI < 0,4 | 29.398 | 22 |
| Classe urbana 2023, 0,4 ≤ NDVI < 0,5 | 20.303 | 20 |
| Classe urbana 2023, NDVI ≥ 0,5 | 31.442 | 23 |
| Total | 353.646 | 400 |

O estrato protegido contém células inteiras recortadas ao município que tocam a área protegida. Seus 65,07 ha não são a área das unidades de conservação. A área protegida oficial permanece calculada por seus próprios polígonos. Da mesma forma, as 1.703 células sem NDVI no quadro incluem fragmentos de borda que o produto centrado excluía, além das observações insuficientes. Não contradizem os 184 pixels insuficientes no indicador anterior.

Foram reservadas 40 unidades para o estrato protegido e pelo menos 20 para cada outro estrato não vazio, limitadas pela respectiva população. As demais vagas são atribuídas sucessivamente ao maior `N_h / (n_h + 1)`, com desempate pela ordem dos identificadores. Isso conserva amostras dos grupos pequenos e concentra o restante nos maiores. Não é uma alocação ótima ajustada a erros ainda desconhecidos. A literatura demonstra que alocação depende do objetivo de área e acurácia. [Wagner e Stehman, 2015](https://experts.esf.edu/esploro/outputs/journalArticle/Optimizing-sample-size-allocation-to-strata/99892567004826).

Não houve seleção manual de parques conhecidos, descarte de áreas cinzas ou preferência por pontos que confirmariam vegetação. Os 215 pontos em faixas inferiores a 0,3 fora das áreas protegidas são parte necessária da avaliação de omissão. Áreas sem dado também têm probabilidade positiva de seleção.

## Ficha de interpretação e controles

Os arquivos estão em `data/processed/meriti/validation/`.

- `sampling-design.json` fixa a data alvo, a janela auxiliar de estratificação, semente, quadro, estratos, probabilidades, método, hashes de entrada e hashes das amostras originais. `target-date-amendment.json` e `sampling-design-before-target-date.json` preservam a revisão anterior à anotação.
- `sample-master.csv` contém os campos do desenho, os indicadores usados na estratificação, a probabilidade `n_h/N_h` e o peso `N_h/n_h`. Deve permanecer intacto e separado da equipe que interpreta.
- `review-blinded-v3.csv` é a ficha a preencher. Contém os identificadores aleatorizados, coordenadas, áreas das células e os campos vazios de referência, incluindo a revisão de adequação e estabilidade temporal. `reference_target_date` já contém a data administrativa do protocolo, 2026-10-01; isso não é um rótulo de cobertura. A ficha não mostra NDVI, estrato, classe MapBiomas ou peso. `review-blinded.csv` e `review-blinded-v2.csv` preservam as versões anteriores vazias; a amostra mestra e seus locais não mudaram.
- `review-form-v3.json` documenta os campos e seus requisitos, com hashes da ficha vazia e da amostra mestra original. A versão v2 também foi preservada.
- `sample-cells-blinded.geojson` define os polígonos a interpretar. `sample-points-blinded.geojson` fornece os pontos internos para navegar até eles.

Criar uma cópia da ficha para cada intérprete. Cada um delimita vegetação na referência adequada sem consultar a predição e avalia sua pertinência a 01/10/2026. A fração `live_vegetation_fraction` é área vegetal nessa data dentro da célula recortada, dividida pela área dessa célula, entre zero e um. `tree_canopy_fraction` usa a mesma data, unidade e denominador. Uma grade regular auxiliar pode ajudar a interpretação, mas sua aproximação e espaçamento devem ser documentados; não deve ser confundida com a amostra probabilística municipal.

Registrar `reference_source`, `reference_image_date`, `reference_resolution_m`, `reference_evidence_id` e o método de interpretação. `reference_image_date` deve conter uma data real de aquisição no formato `YYYY-MM-DD`; intervalos genéricos ou data desconhecida são recusados. `reference_target_date` deve ser `2026-10-01`. `temporal_match_notes` explica a relação da referência com essa data. Quando a aquisição for diferente, `temporal_stability_assessment=stable_at_target` e `temporal_stability_report` preenchido são obrigatórios. Se coincidir, o estado esperado é `same_date`. Registrar intérprete, segundo intérprete e resolução de divergências. A ficha final só recebe `review_status=adjudicated` após essa revisão. Os estados `unreviewed` e `ambiguous` são admitidos durante o trabalho, mas não liberam cálculo.

Os campos `reference_adequacy_report`, `pilot_concordance_report` e `alignment_assessment_report` devem identificar relatórios rastreáveis. O primeiro avalia período, resolução efetiva, nuvens, sombras e capacidade de distinguir a fração alvo. O piloto registra concordância entre intérpretes e casos ambíguos em diferentes condições urbanas. O relatório de alinhamento apresenta os pontos de controle/verificação, resíduos e efeitos sobre as frações. `reference_adequacy_decision` só recebe `approved` após essa avaliação. A resolução nominal continua obrigatória como metadado, com valor positivo e finito.

Uma divergência não pode ser resolvida escolhendo o maior percentual. A equipe deve rever localização, data, sombra, mistura e definição da classe. Preservar as duas interpretações originais e a decisão final, de forma que seja possível avaliar erro de referência. Valores arbóreos desconhecidos ficam vazios, não zero. Isso não bloqueia a área vegetal total quando ela estiver resolvida, mas bloqueia uma estimativa municipal de copas se faltar classificação arbórea em qualquer unidade.

O estimador exige as 400 unidades exatamente uma vez, todos os estratos completos, frações válidas para 01/10/2026, procedência e resolução preenchidas, adequação aprovada e documentada, decisão temporal compatível, dois intérpretes distintos e confirmação de independência. O programa impede cálculo com campos vazios, valores não finitos, duplicatas, data alvo diferente, aquisição sem data real ou referência marcada como ambígua. Ele não consegue certificar a honestidade ou a qualidade das anotações apenas porque os campos foram preenchidos. A revisão científica continua humana.

Não excluir pontos inacessíveis, mover marcadores para áreas mais visíveis ou substituir uma unidade por sua vizinha. Caso a referência não possa ser obtida para todas as unidades, é necessário estudar a não resposta e revisar o desenho explicitamente antes de produzir estimativas. Rótulos usados para treinar ou escolher limiares não devem reaparecer como validação independente do mapa final. Para treinamento, montar outro conjunto; esta amostra fica reservada à avaliação.

## Estimador de área e incerteza

Seja `h` um estrato, `N_h` seu número de células, `n_h` o número sorteado, `a_hi` a área recortada da célula em m² e `f_hi` sua fração vegetal de referência em 01/10/2026. Define-se `y_hi = a_hi × f_hi`. A probabilidade de inclusão é `π_hi = n_h/N_h`. O peso de expansão é seu inverso. Como as células de borda têm áreas diferentes, a conta usa área vegetal por célula, não apenas a média simples das frações.

O total estimado é `Ŷ = Σ_h N_h × média_amostral(y_h)`, equivalente a `Σ_amostra y_hi / π_hi`. O percentual municipal é `100 × Ŷ / A`, com `A` igual à área conhecida do polígono municipal. Esse estimador estratificado do total incorpora vegetação encontrada tanto nos positivos quanto nos negativos do mapa e não precisa de uma classificação binária como verdade.

A variância estimada é `V̂(Ŷ) = Σ_h [N_h² × (1 − n_h/N_h) × s_h² / n_h]`, onde `s_h²` é a variância amostral de `y_hi`, com divisor `n_h − 1`. Um estrato censitado tem variância amostral de desenho igual a zero. O erro padrão do percentual é `100 × sqrt(V̂(Ŷ)) / A`.

O intervalo normal aproximado de 95% é `Ŷ ± 1,96 × sqrt(V̂(Ŷ))`, convertido também em percentual. O programa preserva os limites sem truncá-los automaticamente a zero ou cem; se isso ocorrer, será um sinal para rever a aproximação estatística. Esse intervalo representa apenas a incerteza do sorteio, condicionada às frações de referência. Não incorpora, por si, erro de interpretação, deslocamento geométrico ou incompatibilidade temporal.

Os princípios da estimação estratificada continuam aplicáveis quando os estratos auxiliares não correspondem às classes finais do mapa. A matriz de erro deve usar estimadores compatíveis com esse desenho, e não frequências brutas da amostra desproporcional. [Stehman, 2014](https://www.tandfonline.com/doi/abs/10.1080/01431161.2014.930207).

Este programa calcula área fracionária de referência e seu erro padrão. Ele não gera automaticamente uma matriz binária de confusão, acurácia do usuário ou acurácia do produtor. Essas medidas exigem definição prévia de classe binária e suporte espacial. Se produzidas, devem acompanhar a área fracionária, sem substituí-la e sem chamar uma fração de 10% e uma de 90% de equivalentes só por ambas conterem vegetação.

## Tamanho amostral e limites de publicação

Uma conta inicial sob amostragem aleatória simples, proporção 0,5 e aproximação normal produziria cerca de 385 unidades para margem de cinco pontos percentuais a 95%. Ela não garante essa margem para esta amostra estratificada, para copas, bairros ou unidades protegidas.

O desenho de 400 unidades já sorteadas apresenta uma semiamplitude conservadora de planejamento de aproximadamente 5,88 pontos percentuais, usando valores possíveis de zero a 100 m² por célula e a alocação efetiva. Esse número foi calculado antes de observar qualquer rótulo. Não é intervalo de confiança observado nem garantia de precisão. O intervalo final só será conhecido após a interpretação. Se a precisão esperada não atender à dissertação, aumentar a amostra exige registrar uma extensão probabilística e suas novas probabilidades, sem escolher os novos pontos pelo resultado desejado.

Não se promete precisão por bairro, por APA ou para árvores com apenas esta amostra municipal. Os 40 pontos do estrato protegido não são seis amostras de tamanho suficiente, uma para cada unidade. Para publicar resultados nesses domínios, planejar tamanho adicional e estimadores de domínio antes da interpretação.

O produto defensável nesta entrega é um mapa espectral exploratório acompanhado de dados e procedimentos reproduzíveis, mais um plano de validação executável com amostra real. A futura afirmação de cobertura vegetal será uma estimativa amostral ajustada por referência para 01/10/2026, com definição explícita, erro padrão, limitações de referência e, quando possível, distinção arbórea. A interpretação poderá confirmar ou refutar hipóteses sobre sub-representação da vegetação urbana; o método não assume o resultado.

## Execução

O sorteio original já existe. Não executar novamente sobre a mesma pasta e não editar a amostra mestra. O programa recusa sobrescrever diretórios de amostra que contenham arquivos. Para reproduzir o sorteio sem afetar os originais, usar outra pasta dentro do projeto, conservando tamanho e semente.

```powershell
.\.venv\Scripts\python.exe scripts/meriti/validation_sampling.py generate --output data/processed/meriti/validation-reproduction
```

Após obter e revisar a referência, salvar uma cópia anotada da ficha, preservando o original. O exemplo abaixo só deve ser executado quando esse arquivo existir e as 400 unidades estiverem concluídas.

```powershell
.\.venv\Scripts\python.exe scripts/meriti/validation_sampling.py estimate --annotations data/processed/meriti/validation/review-adjudicated.csv --output data/processed/meriti/validation/area-estimate.json
```

Acrescentar `--tree-canopy` e escolher outro arquivo de saída para estimar copas quando o campo estiver completo em toda a amostra. O resultado registra hashes da ficha anotada e do desenho. A repetição do teste com a ficha vazia deve falhar, comprovando que nenhum rótulo foi convertido em zero.

Os testes de cálculo usam populações sintéticas explicitamente identificadas no código, sem gravar rótulos artificiais na amostra real. Verificam pesos desiguais, variância com correção de população finita, censo, subsetor arbóreo e rejeição de anotações inválidas.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s scripts/meriti -p test_validation_sampling.py -v
```
