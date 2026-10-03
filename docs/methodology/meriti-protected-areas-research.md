# Áreas protegidas e hidrografia de São João de Meriti

Pesquisa realizada em 3 de outubro de 2026 para acrescentar evidências cartográficas ao explorador. Este documento registra a investigação das fontes e recomendações de processamento. A metodologia principal deve registrar quais recomendações foram efetivamente incorporadas ao aplicativo.

## Resultado da investigação

Foi encontrada cartografia oficial para as seis unidades de conservação municipais. Portanto, não é necessário inferir seus perímetros a partir de imagem de satélite ou Google Maps. A camada municipal do GeoINEA, referência 2024 e ciclo ICMS Ecológico 2025, contém cinco Áreas de Proteção Ambiental e o Parque Natural Municipal Jardim Jurema. Os seis registros e seus polígonos estão no serviço do próprio INEA. [Camada oficial de UCs municipais](https://geoportal.inea.rj.gov.br/server/rest/services/Unidades_de_Conserva%C3%A7%C3%A3o/FeatureServer/11).

O Atlas das Unidades de Conservação Municipais do Estado do Rio de Janeiro confirma essa relação nas páginas 134 e 135. O Atlas foi divulgado em 2025, mas consolida um censo realizado entre 2019 e 2022. Não se deve confundir a data de disponibilização com a data das informações. [Atlas do INEA](https://www.inea.rj.gov.br/wp-content/uploads/2025/03/livro.pdf), [nota oficial sobre o lançamento](https://www.inea.rj.gov.br/secretaria-do-ambiente-entrega-cameras-para-monitoramento-da-fauna-e-lanca-atlas-inedito-das-unidades-de-conservacao/).

O Programa Municipal de Educação Ambiental publicado no Diário Oficial de 11 de junho de 2026 também descreve cinco APAs e um parque. O portal oferece extração por OCR, que avisa sobre possíveis erros de reconhecimento. A contagem foi confrontada com a cartografia e o Atlas, sem depender exclusivamente desse OCR. [Diário Oficial original](https://transparencia.meriti.rj.gov.br/diario_oficial_get_anexo.php?codigo=10853), [versão pesquisável do mesmo documento](https://transparencia.meriti.rj.gov.br/diario_oficial_get_anexo.php?codigo=10853&ocr=s).

## Nomes, categorias e coordenadas para marcadores

Os nomes e atos abaixo provêm dos campos `nomeoficia`, `categoria` e `ato` do cadastro espacial do INEA. As áreas são as declaradas no campo `area_ha`, arredondadas para quatro casas. Não foram recalculadas para substituir a área do cadastro. Os pontos são derivados dos polígonos oficiais mediante `representative_point()` em SIRGAS 2000 / UTM 23S, EPSG:31983, e convertidos para longitude e latitude em WGS84, EPSG:4326. Eles ficam dentro dos polígonos e servem exclusivamente para rotulagem e seleção no mapa. Não representam portaria, acesso público, endereço, sede administrativa ou levantamento de campo. [Dados do cadastro](https://geoportal.inea.rj.gov.br/server/rest/services/Unidades_de_Conserva%C3%A7%C3%A3o/FeatureServer/11).

| Unidade | Categoria | Identificador INEA | Área cadastrada, ha | Longitude do marcador | Latitude do marcador | Ato informado no cadastro |
| --- | --- | --- | --- | --- | --- | --- |
| Área de Proteção Ambiental Limoeiro | APA, uso sustentável | 312 | 10,0556 | -43,3397823 | -22,7700277 | Decreto 4.969, de 20/04/2010 |
| Parque Natural Municipal Jardim Jurema | Parque, proteção integral | 314 | 14,8205 | -43,3432958 | -22,7859497 | Decreto 4.220, de 25/03/2004 |
| Área de Proteção Ambiental do Parque Vitória | APA, uso sustentável | 315 | 2,9065 | -43,3429188 | -22,7806015 | Decreto 4.969, de 20/04/2010 |
| Área de Proteção Ambiental Aeronáutica | APA, uso sustentável | 316 | 11,6367 | -43,3332013 | -22,7767036 | Decreto 4.969, de 20/04/2010 |
| Área de Proteção Ambiental Andorinhas | APA, uso sustentável | 319 | 16,2211 | -43,3450512 | -22,7715676 | Decreto 4.969, de 20/04/2010 |
| Área de Proteção Ambiental do Jardim Santo Antônio | APA, uso sustentável | 320 | 3,5428 | -43,3456646 | -22,7820710 | Decreto 4.969, de 20/04/2010 |

As casas decimais das coordenadas preservam a operação numérica para reprodução. Não indicam precisão centimétrica dos levantamentos de origem. O serviço não publica acurácia posicional numérica para esses seis polígonos.

A soma das áreas declaradas é 59,18334596 ha. A área calculada em EPSG:31983 é 59,17840690 ha. A diferença de aproximadamente 49,39 m² decorre da comparação entre a área tabular do cadastro e o cálculo feito sobre as geometrias baixadas. Ela não foi distribuída entre as unidades nem tratada como mudança de limite. Todas as seis geometrias são válidas e a operação de diferença em relação ao limite municipal IBGE usado no aplicativo retornou zero m² fora de Meriti.

O termo verificado nas fontes é APA, Área de Proteção Ambiental, além da categoria Parque Natural Municipal. Não foi localizada uma categoria municipal denominada ZAPA que justificasse renomear essas seis unidades. A interface deve usar "Áreas protegidas" ou "APAs e parque municipal". Não deve chamar o Jardim Jurema de APA. A área legalmente protegida também não equivale à área atualmente vegetada.

O campo `cd_cnuc` informa "Não consta no cnuc" para os seis registros nessa edição do INEA. Isso descreve o cadastro consultado, não uma certificação de ausência no CNUC em outubro de 2026. Uma pesquisa limitada a unidades com código CNUC preenchido descartaria indevidamente as seis geometrias recuperadas.

## Outras áreas citadas em documentos

A Prefeitura também cita o Horto Municipal Sérgio Luiz e o Parque Boa Vista, associado ao Pau Branco, em ações ambientais. A notícia descreve intervenções em Limoeiro, Andorinhas, Aeronáutica, Boa Vista e Jardim Jurema. Essas referências não autorizam contar o horto ou Boa Vista como uma sétima ou oitava UC na mesma edição da camada oficial. [Notícia municipal sobre conservação](https://meriti.rj.gov.br/inicio/conservacao-ambiental-e-pauta-em-meriti/).

Um termo técnico do executor do programa Florestas do Amanhã apresenta coordenadas UTM e áreas destinadas à restauração em Andorinhas, Limoeiro, Aeronáutica, Jardim Jurema e AEIA Boa Vista. Essas áreas de intervenção têm valores diferentes das áreas integrais das UCs. Não devem substituir os limites ou áreas oficiais. O documento seria uma fonte de localização alternativa, mas foi dispensado para a camada de UCs porque os polígonos oficiais foram recuperados. [Documento técnico do IDG](https://idg.org.br/download/arquivo/ANEXO%2BII%2Bdo%2BTQT%2BTermo%2Bde%2BQualifica%C3%A7%C3%A3o%2BT%C3%A9cnica%2B-%2BCaracteriza%C3%A7%C3%A3o%2Bdas%2B%C3%81reas%2Bpara%2BRestaura%C3%A7%C3%A3o%2BFlorestal%2B%28revis%C3%A3o%2BA%29.pdf?id=4898).

## Hidrografia oficial recuperada

O GeoINEA publica a Base Cartográfica Vetorial Contínua do Estado do Rio de Janeiro, BC25_RJ, escala 1:25.000, edição 2018, elaborada por IBGE e Governo do Estado / SEA. Os metadados informam interpretação de fotografias aéreas, levantamentos de campo e informações de parceiros. Foram recuperadas as classes de trechos de drenagem, canais e massas d'água diretamente do serviço oficial. A consulta de 2026 não transforma essa base em um levantamento de 2026. [Trechos de drenagem](https://geoportal.inea.rj.gov.br/server/rest/services/BC_25/FeatureServer/84), [canais](https://geoportal.inea.rj.gov.br/server/rest/services/BC_25/FeatureServer/89), [massas d'água](https://geoportal.inea.rj.gov.br/server/rest/services/BC_25/FeatureServer/118).

Foi usada uma consulta espacial com a caixa de longitude/latitude `[-43.425, -22.83, -43.315, -22.74]`, mais ampla que o município. O objetivo foi recuperar os rios que passam junto aos limites e evitar que diferenças entre limites administrativos e eixos dos rios produzissem interrupções artificiais. O retorno bruto contém 197 trechos de drenagem, 26 canais e 11 polígonos de massas d'água. Esses números são feições cartográficas, não contagens de rios.

Entre os nomes encontrados estão Rio Pavuna, Canal de Sarapuí, Rio São João de Meriti, Rio Acari, Rio da Prata, Rio Dona Eugênia e Rio dos Cachorros. Os metadados e nomes originais foram preservados. "Canal de Sarapuí" pode ser apresentado com o nome usual Rio Sarapuí entre parênteses, desde que a origem cartográfica continue identificável. O conjunto também contém trechos sem nome. Não se deve inventar nomes nem identificar um trecho sem nome por proximidade apenas.

### Por que não limitar os rios ao interior do município

Uma seleção por interseção estrita com o limite de Meriti encontrou apenas 71 dos 197 trechos de drenagem baixados. Para o Rio Pavuna, a seleção caiu de 34 trechos na caixa de consulta para 12 que cruzam o limite municipal. Um entorno de 100 metros já recupera 27. O desaparecimento desses trechos seria consequência do recorte, não ausência de rio.

Uma faixa de contexto de 500 metros ao redor do município seleciona 127 trechos de drenagem, 18 canais e 9 polígonos de água. Entre os trechos selecionados estão 32 do Pavuna, 32 do Sarapuí, três do Acari e um do Rio São João de Meriti. O procedimento recomendado é projetar o limite para EPSG:31983, criar `buffer(500)`, intersectar as geometrias com esse entorno, e só então voltar para EPSG:4326. O aplicativo deve dizer "Meriti e entorno de 500 m". A faixa é uma escolha de visualização, não APP, zona de risco, área protegida ou bacia hidrográfica.

As contagens acima foram feitas por seleção de feições antes do recorte da geometria. Intersectar uma feição com o entorno pode dividi-la em várias partes. A contagem final de elementos renderizados pode, portanto, ser diferente. Não se deve somar comprimentos de segmentos fora do município e apresentá-los como extensão de rios exclusivamente de Meriti.

### Duplicação detectada

As camadas 88, `gln_hid_canal_vala_25`, e 89, `gln_hid_canal_25`, retornaram os mesmos 26 canais, com os mesmos identificadores e geometrias, no recorte consultado. A igualdade foi verificada no conteúdo JSON completo das respostas. A resposta da camada 88 foi preservada para auditoria.

Uma segunda verificação detectou que todos os 24.853,92 metros dos 26 canais da camada 89 já estão contidos geometricamente na união dos 197 trechos de drenagem da camada 84. A interseção linear exata em EPSG:31983 corresponde a 100% do comprimento desses canais. Portanto, o produto deve usar a camada 84 como rede linear, sem acrescentar as geometrias 88 ou 89. A camada 89 pode apoiar a identificação do tipo canal por correspondência geométrica, mas não pode aumentar o comprimento ou a contagem de cursos d'água.

Todos os 197 trechos, os 26 canais e os 11 polígonos de água recuperados passaram na verificação de validade geométrica do GeoPandas/Shapely. Essa validade não comprova atualização física dos cursos d'água nem conectividade hidráulica completa.

### Limites de interpretação

- A BC25_RJ é adequada ao reconhecimento do sistema hídrico local nessa escala. Não é cadastro completo de galerias, bocas de lobo ou microdrenagem urbana.
- Valores como `navegavel = Desconhecido` e `larguramed = 0` não autorizam rotas navegáveis ou largura física igual a zero.
- Um trecho encoberto ou sem nome não deve desaparecer da camada por falta de atributos descritivos.
- O traçado não mede vazão, profundidade, qualidade da água, capacidade de drenagem ou risco atual de inundação.
- A suscetibilidade do SGB deve continuar separada. Não se deve inferir risco apenas pela distância ao rio.
- Se uma futura imagem mostrar um traçado diferente, registrar a edição interpretada como hipótese com fonte, data da imagem, método e grau de incerteza, sem sobrescrever silenciosamente a geometria oficial.

## Coleta e rastreabilidade

As respostas dos serviços foram salvas com os arquivos `features.geojson`, `layer-metadata.json` e `provenance.json`. A proveniência registra URL, parâmetros, instante de coleta, quantidade de feições, tamanho e SHA-256 dos arquivos. O serviço exportou GeoJSON em EPSG:4326, com `outSR=4326`, `returnZ=false` e `returnM=false` nas consultas finais.

| Diretório em `data/raw/meriti` | Camada | Resposta bruta | Decisão recomendada |
| --- | --- | --- | --- |
| `inea__ucs_municipais__2024_icms2025` | UCs municipais, camada 11 | 12 polígonos na caixa, seis de Meriti | Filtrar `municipio == 'SAO JOAO DE MERITI'` |
| `inea__hidrografia_bc25__consulta2026` | Trechos de drenagem, camada 84 | 197 feições | Usar como hidrografia oficial de referência |
| `inea__canal_bc25__consulta2026` | Canais, camada 89 | 26 feições | Usar apenas como referência temática, pois 100% do comprimento já está na camada 84 |
| `inea__canal_vala_bc25__consulta2026` | Canal/vala, camada 88 | 26 feições | Excluir do produto por duplicar a camada 89 |
| `inea__massa_dagua_bc25__consulta2026` | Massas d'água, camada 118 | 11 feições | Usar com a rede linear para representar margens cartográficas |

A primeira consulta de UCs usou `municipio LIKE '%Meriti%'` e retornou zero. O cadastro usa letras maiúsculas. A resposta vazia e sua proveniência foram preservadas como `query-by-municipality-empty.geojson` e `initial-query-provenance.json`. A consulta espacial recuperou as unidades. Esse episódio não foi registrado como ausência de áreas protegidas.

O endpoint inicial tentado em `/arcgis/rest/services` retornou 404. O servidor público atual do INEA usa `/server/rest/services`, e o catálogo usa `/portal/sharing/rest`. A falha do primeiro endereço não significa indisponibilidade do GeoINEA.

As camadas estão publicamente acessíveis em serviço governamental. Os metadados recuperados não trazem licença explícita de reutilização para as UCs. Para hidrografia, o campo de créditos identifica IBGE/DGC/Coordenação de Cartografia. Manter atribuição INEA e IBGE/SEA e não inventar uma licença Creative Commons ou domínio público.

## Fontes adicionais examinadas e não promovidas

O MPRJ mantém um espelho da hidrografia estadual em escala 1:25.000, atribuído ao INEA, com coleta pelo MPRJ em 2022 e publicação original indicada como 2016. Como a versão 2018 está acessível no GeoINEA, o espelho foi usado somente como confirmação e alternativa de recuperação. [Catálogo MPRJ](https://geo.mprj.mp.br/portal/home/item.html?id=874574678bb543c8bed3ea743e94339c), [serviço MPRJ](https://geo.mprj.mp.br/arcgis/rest/services/meio_ambiente/Hidrografia_Drenagem_Estadual/FeatureServer).

A camada de Índice de Qualidade da Água no serviço de Recursos Hídricos do INEA retornou a estação AC241, no Rio Acari, em `[-43.350416196, -22.821497586]`, no entorno mais amplo. O registro tem frequência bimestral e uma classe, mas não tem data de amostragem ou período do resultado nos campos disponíveis. A classe não deve ser publicada como qualidade atual da água. A recomendação é obter uma série datada antes de acrescentar essa estatística. [Camada consultada](https://geoportal.inea.rj.gov.br/server/rest/services/Recursos_Hidricos_Gestao_Costeira/FeatureServer/0).

Um PDF legislativo de 2025 no SAPL também cita as APAs e os decretos, mas é arquivo de matéria legislativa. Não foi usado como se fosse texto consolidado da lei vigente. Os atos apresentados nesta pesquisa foram transcritos dos atributos do cadastro espacial e devem ser tratados como referência de origem, sem substituir a leitura dos decretos em uma análise jurídica. [Matéria legislativa consultada](https://sapl.saojoaodemeriti.rj.leg.br/media/sapl/public/materialegislativa/2025/339/ilovepdf_merged_3.pdf).

## Critérios recomendados para publicação no explorador

Na implementação, a validação encontrou também sobreposições dentro da camada 84. Após classificar canais, os traçados foram unidos por nome e categoria, preservando os IDs de origem. O produto final tem dez feições multipartes, com 49.566,76 m de comprimento no recorte com entorno de 500 m. Foram removidos 14.405,50 m de repetição. Os 127 registros mencionados na pesquisa são os registros de origem após recorte, não 127 trechos exclusivos. O procedimento completo está em [meriti.md](meriti.md).

1. Publicar as seis unidades com marcadores identificados e polígonos do INEA, distinguindo APA e parque.
2. Mostrar a data da referência cartográfica e explicar que o marcador é um ponto interno calculado.
3. Manter a rede oficial de rios e canais em camada independente da suscetibilidade à inundação.
4. Declarar a faixa de contexto utilizada e preservar os rios de borda.
5. Manter a hidrografia colaborativa do OpenStreetMap como fonte distinta, sem apresentar uma fusão como se fosse um único levantamento oficial.
6. Expor os limites de uso em informações acessíveis por mouse, teclado e toque, com fonte e data também na exportação.
7. Não transformar nenhuma dessas camadas em pontuação composta, ranking de bairros ou avaliação de risco.
