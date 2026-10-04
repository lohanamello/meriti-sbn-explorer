# Auditoria das referências para validar vegetação em Meriti

Auditoria executada em 03/10/2026. O objeto principal continua sendo a fração de toda a vegetação viva em 01/10/2026. Esta auditoria não altera a amostra, o estimador ou a data-alvo e não preenche a ficha de referência como se houvesse interpretação humana concluída.

## Resultado obtido nesta rodada

Foi adquirida uma referência aberta adicional de **02/07/2026**, CBERS-4A/WPM nível 4. O produto contém uma banda pancromática de 2 m e quatro bandas multiespectrais de 8 m, incluindo infravermelho próximo. Os valores digitais originais foram preservados em cinco GeoTIFFs. Foram preparados 400 painéis de interpretação, um por célula da amostra existente. O catálogo de RGB já fusionado, consultado anteriormente, não incluía essa aquisição. A licença informada pelo INPE para a coleção L4 é Creative Commons Attribution 4.0 International. [Item original](https://data.inpe.br/bdc/stac/v1/collections/CB4A-WPM-L4-DN-1/items/CBERS_4A_WPM_20260702_198_142_L4), [coleção e licença](https://data.inpe.br/bdc/stac/v1/collections/CB4A-WPM-L4-DN-1).

Também foram produzidos 400 recortes da imagem CBERS de 02/09/2026 e 400 da imagem de 26/04/2026. A imagem de abril já existia no projeto e foi reutilizada após conferir seu SHA-256. Setembro é mais próximo da data-alvo, mas a inspeção cega do piloto encontrou nuvens, névoa ou sombras que impedem uma fração confiável nas 16 células examinadas. Não se descartou automaticamente toda a cena com base no percentual global de nuvens. Os 400 recortes permanecem disponíveis para avaliação local posterior. [Cena de setembro](https://data.inpe.br/bdc/stac/v1/collections/CB4A-WPM-PCA-FUSED-1/items/CBERS4A_WPM_PCA_RGB321_20260902_198_142).

Há agora imagens e um piloto visual efetivamente inspecionado. Continuam existindo **zero rótulos aceitos de fração vegetal e zero células com dupla interpretação independente**. Seria incorreto transformar o número de recortes gerados em número de células validadas.

## Busca completa e triagem espacial

Foram consultadas as três coleções WPM públicas do INPE, de 01/01/2026 até 03/10/2026, no retângulo que envolve Meriti. Foram retornados 5 itens PCA fusionados, 15 itens L4 e 3 itens L2. Cada consulta conferiu o número de itens devolvidos contra o total informado pelo servidor. As respostas e suas URLs completas foram preservadas com data de consulta e SHA-256.

A interseção do retângulo da consulta não assegura que a imagem cubra a cidade. Depois da busca, foi testada a interseção das geometrias das cenas com as células cegas. Por exemplo, o item de 28/07/2026 intersecta o retângulo de busca, mas **nenhuma das 400 células**. Os itens de 02/07 e 27/06 cobrem as 400 células; o primeiro foi adquirido por ser o mais recente desses dois. Janeiro e março também tinham resultados de retângulo sem interseção com as células. O inventário registra esses casos e evita aceitar imagens vazias como referência.

O caminho de reprodução está em `scripts/meriti/reference_audit.py`. As ações são `catalogs`, `chips --item <id PCA>`, `l4-bands --item <id L4>`, `esri-cells` e `alignment`. O script lê somente o arquivo de células cegas para localização e seleção do piloto. Não lê a amostra mestra, o estrato, os valores de NDVI, o MapBiomas ou a altura modelada de copas.

## Preparação e inspeção cega do piloto

Os 16 IDs foram selecionados sem reposição entre os 400 IDs cegos, usando NumPy PCG64 e semente 20261003. Esse subconjunto serve para testar a adequação da referência. Ele não constitui uma nova estimativa municipal nem pode ser interpretado como uma amostra aleatória simples da área do município.

Cada painel de julho mostra um contexto de aproximadamente 80 × 80 m. O contorno magenta representa a geometria integral da célula sorteada, inclusive seu recorte no limite municipal. Há três visões separadas. PAN conserva a banda de 2 m; RGB usa as bandas 3, 2 e 1 de 8 m; a falsa cor usa as bandas 4, 3 e 2 de 8 m. Para exibição, cada banda recebeu um estiramento linear entre seus percentis 2 e 98 calculados no recorte municipal, seguido de ampliação pelo vizinho mais próximo. Os limites numéricos estão no arquivo `pilot-selection.json`. Não houve fusão espacial, super-resolução, geração de detalhes, correção de imagem por IA ou cálculo de NDVI a partir de valores digitais sem calibração.

No piloto de julho não se observaram nuvens óbvias impedindo a leitura de contexto. A PAN resolve telhados e algumas texturas; o infravermelho distingue indícios de vegetação em vários locais. Entretanto, uma célula de 10 m contém apenas cerca de 1,25 pixels multiespectrais por lado. Jardins pequenos, mistura de materiais, sombras e limites de copas continuam ambíguos.

Em **MERITI-V1-0130, MERITI-V1-0243 e MERITI-V1-0339**, a inspeção por IA registrou presença provável de vegetação viva pela combinação de textura e resposta na falsa cor. Não foi atribuída fração numérica. Em MERITI-V1-0243 a célula recortada é muito estreita, agravando a mistura espacial. As outras 13 células ficaram indeterminadas para o alvo de toda a vegetação viva. A presença predominante de telhados ou piso não foi transformada em ausência confirmada de plantas pequenas. Estas observações são um **piloto de IA**, separado da ficha de referência. Não representam dois intérpretes independentes nem verdade de campo.

O mosaico aberto do piloto tem 116.894 bytes, 2160 × 1160 pixels. Caminho `data/interim/meriti/independent-reference-audit/CBERS_4A_WPM_20260702_198_142_L4/blind-pilot-sheet.png`. Crédito para publicação: INPE, CBERS-4A/WPM, aquisição de 02/07/2026, CC BY 4.0; visualização elaborada pelo projeto.

## Presença de dados e alinhamento

Nas 400 células de julho, todos os pixels cujo centro cai dentro da célula tinham valores digitais maiores que zero. Quatro células recortadas não contêm centro de pixel PAN de 2 m; doze não contêm centro de pixel multiespectral de 8 m. Nesses casos o campo de presença é nulo, e não zero. Isso decorre do tamanho e da forma das células recortadas e não prova ausência de imagem. Valores digitais não nulos não certificam ausência de nuvens, sombras ou mistura.

Foi calculado um diagnóstico de alinhamento relativo entre a banda verde do RGB fusionado de 26/04 e a PAN de 02/07 nos 16 contextos do piloto. A imagem de abril foi expressa na grade de julho por interpolação bilinear apenas para a comparação. Em cada contexto de 160 m, correlacionaram-se magnitudes de gradiente na região central de aproximadamente 120 m, testando translações de −10 a +10 m em passos de 2 m. Não foi ajustada nem aplicada transformação às referências.

A translação que maximizou a correlação teve magnitude mediana de 2 m, variando de 0 a 2,83 m. Nenhum ótimo atingiu a borda da busca. A correlação variou de 0,415 a 0,737, com mediana de 0,583. Os resultados por ID estão em `relative-alignment-pilot.json`.

Esse é um diagnóstico de concordância entre patches de imagem, **não RMSE de pontos de controle, precisão absoluta, deslocamento medido da Esri ou aprovação do registro**. Mudanças de sombra, perspectiva de edifícios e cobertura podem alterar o máximo da correlação. Um deslocamento de 2 m já pode mudar materialmente a fração de uma célula de 10 m; o protocolo ainda requer avaliação de pontos estáveis e efeito do alinhamento sobre as frações.

## Referência submétrica Esri, datas e uso

Foram obtidos os polígonos públicos de metadados World Imagery e cruzados com as 400 células. No nível de metadado de 30 cm, 228 células intersectam somente a aquisição de **16/06/2025**, cuja resolução de origem declarada é 0,34 m; 171 somente a aquisição de **24/12/2025**, a 0,50 m; uma célula cruza os dois polígonos. A publicação é de 2026, mas as aquisições são de 2025. A resolução de amostragem da camada de 0,30 m não substitui a resolução de origem. O campo `SRC_ACC` informa 8,47 m em ambos os registros; esse valor é nominal do metadado, não erro observado neste projeto. [Metadados originais](https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/9), [como consultar a data da imagem](https://support.esri.com/en-us/knowledge-base/how-to-view-the-world-imagery-basemap-metadata-in-arcgi-000018129).

As imagens Esri não foram baixadas em lote nem redistribuídas. Os termos oficiais consultados proíbem coleta sistemática de mosaicos fora dos mecanismos Esri e não concedem licença aberta para hospedagem de recortes. A utilização e exportação dependem da assinatura e do software permitidos. O serviço informa `exportTilesAllowed=false`. Foram mantidos metadados e caminhos de consulta, sem apresentar a Esri como fonte aberta de 400 imagens. [Item e termos](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9), [resumo oficial atualizado em 21/04/2025](https://www.esri.com/content/dam/arcgisonline/docs/tou_summary.pdf).

Uma validação histórica de 2025 pode usar essas datas reais em ambiente institucional licenciado e observações Sentinel-2 temporalmente correspondentes, depois de verificar registro, obstruções e acordo entre intérpretes. Isso seria um produto histórico separado. A dupla data de aquisição não autoriza chamar o conjunto de retrato municipal em um único dia. A simples concordância espectral com 2026 também não provaria estabilidade das pequenas frações vegetadas.

## O que falta para concluir a validação da fração

Julho permite começar a interpretação com referência aberta e testar presença provável em parte do piloto. Ainda não sustentou um percentual municipal validado. Faltam referência espacial capaz de resolver plantas pequenas e células recortadas, verificação independente de alinhamento, interpretação quantitativa por dois revisores com adjudicação e confirmação temporal para o alvo de 01/10/2026. A geração dos 400 painéis elimina a preparação repetitiva de imagens, mas não elimina essas observações.

É possível propor um produto histórico específico de 02/07/2026 aproveitando a nova referência. Isso exigiria definir e testar suas próprias limitações e não aprovar automaticamente a referência por ter pixels de 2 m. Os arquivos cegos principais e o estimador foram preservados. Nenhum rótulo inferido de NDVI ou altura de copas foi usado como referência.

As consultas a fontes estaduais e municipais encontraram referências ao Projeto RJ25 histórico e a ortofotos recentes do município do Rio, sem demonstrar cobertura recente adequada de Meriti. Não se tratou essa busca negativa como prova de inexistência de levantamentos locais. [Material de referência do SGB para o Rio de Janeiro](https://www.sgb.gov.br/saiba-mais-cartas-geomorfol%C3%B3gicas).

## Interface de consulta de 04/10/2026

O objetivo reafirmado é medir a fração horizontal de toda vegetação viva, incluindo copas, arbustos, gramados e jardins. Copas isoladamente, presença de árvores nas vias e recorrência do NDVI permanecem medidas complementares. Os atalhos da interface agora explicitam essas diferenças.

A galeria de validação passou a oferecer consulta interativa à imagem Esri, com a geometria cega da célula, zoom, escala e tela cheia. O mapa carrega somente a área visualizada pelo usuário, sem coleta de mosaicos, extração automática, recortes redistribuídos ou gravação de rótulos. A camada de metadados consultada em 03/10/2026 é exibida por célula como registro histórico; não certifica a imagem atual de um serviço mutável. A geometria não foi ajustada visualmente à imagem. O contorno é a célula sorteada, não uma previsão de vegetação.

Essa melhoria não altera os rasters analíticos, a amostra ou as frações aceitas. Continuam faltando referência com data adequada ao alvo, avaliação do alinhamento e interpretação independente. Para produzir uma nova classificação publicável de alta resolução, é necessário obter imagens cuja licença permita processamento e publicação dos derivados, executar um piloto que diferencie vegetação, superfícies não vegetadas e áreas indeterminadas, e avaliar o resultado com observações independentes não usadas no ajuste. O fluxo oficial de extração automatizada de World Imagery consultado nesta data requer conta organizacional e restringe seus derivados a uso não comercial dentro do ArcGIS: https://www.esri.com/arcgis-blog/products/arcgis-living-atlas/imagery/learn-to-use-ai-to-extract-information-from-world-imagery . A exibição da imagem não foi tratada como licença para publicar tal classificação fora desse ambiente.
