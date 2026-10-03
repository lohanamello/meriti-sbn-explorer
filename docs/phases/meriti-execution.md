# São João de Meriti

Esta adaptação segue os documentos de controle das fases 1, 2 e 3. O município é São João de Meriti, código IBGE 3305109. Os arquivos do projeto do Rio permanecem preservados. Os novos produtos ficam em `data/{catalog,interim,processed}/meriti/`.

## Fase 1. Coleta

Reutilizar fontes estaduais e nacionais preservadas em `data/raw/`, verificando a cobertura de Meriti. Registrar novas fontes no inventário específico do município, com procedência, data, acesso, limitações e arquivos originais. Investigar IBGE, SGB, MapBiomas, saneamento, INEA, ANA, Cemaden, prefeitura e OpenStreetMap. As bases municipais da capital não são evidência de Meriti.

O inventário e os scripts originais sobreviveram à limpeza. O GitHub está no commit `28f56acb6f9b81ffd81b7ee120113d243c67973b`, também presente localmente. O histórico versiona a procedência dos brutos, mas exclui os arquivos grandes pelo `.gitignore`. Os brutos locais incluem a malha estadual do Censo 2022 e cinco rasters nacionais MapBiomas de 2019 a 2023. Não foi necessário recuperar esses arquivos da Vercel.

Critério de conclusão: fontes principais investigadas, arquivos legíveis, procedência preservada, falhas e cobertura registradas.

## Fase 2. Curadoria

Victor confirmou o uso dos bairros do IBGE. O Censo preservado contém 809 setores de Meriti, 16 códigos de bairro e três distritos, somando 440.962 pessoas. Bairros e distritos não formam uma hierarquia estrita. Agregar cada divisão diretamente dos setores, por código, sem encaixar artificialmente um bairro em um distrito.

Usar interseção de polígonos em SIRGAS 2000 / UTM 23S para áreas e cruzamentos. Publicar GeoJSON em EPSG:4326. Recortar MapBiomas sobre limites fixos do Censo 2022, conservar a coleção e a legenda entre anos e registrar pixels sem informação. Suscetibilidade de 2015 é contexto histórico, não previsão de eventos ou diagnóstico atual de drenagem.

Não reproduzir indicadores municipais nos bairros como se fossem observações locais. Não preencher ausências com zero. Densidade populacional mede concentração de população, não vulnerabilidade social. Cobertura classificada como urbana não mede diretamente impermeabilidade. Victor decidiu apresentar somente indicadores, sem pontuação composta nem ranking. A ausência de classes de inundação e as limitações da classificação de vegetação permanecem explícitas. Não calcular nem exibir pontuações de Meriti.

Critério de conclusão: conservação da população, geometrias válidas, cobertura espacial e temporal aferida, transformação reproduzível, promoção registrada e limitações descritas.

## Fase 3. Implementação

Preservar a composição visual do site. Substituir referências territoriais da capital por município, distritos, bairros e setores disponíveis em Meriti. Manter mapa, seleção territorial, camadas, legenda, cartão, lentes técnica e pública e catálogo. Mostrar datas nas evidências. Permitir comparação anual somente entre recortes da mesma coleção validados na fase 2. Permitir exportação da síntese selecionada com fontes e limitações.

Critério de conclusão: validações de dados, testes de interação, build, revisão visual e revisão adversarial Astra High concluídos. Corrigir bugs reproduzidos durante a adaptação. Não publicar alterações no site do Rio como efeito colateral.

## Primeira entrega verificada em 3 de outubro de 2026

As três fases foram executadas. O catálogo contém 24 fontes, com dez promovidas, 12 diferidas e duas rejeitadas. O aplicativo oferece oito camadas, quatro escalas territoriais, busca, cinco anos comparáveis de cobertura vegetal, lentes de interpretação e exportação de indicadores com referências completas.

A validação geográfica passou para as 829 unidades. Todas as divisões conservam as 440.962 pessoas do Censo; as geometrias são válidas e não apresentam lacunas ou sobreposições relevantes. Os cinco recortes anuais têm 100% de pixels válidos no município. Os hashes dos produtos foram conferidos.

Verificação da aplicação: 16 testes unitários aprovados, seis testes de navegador aprovados em computador e celular, análise estática sem erros ou avisos e build de produção concluído. Os testes cobrem seleção territorial, busca sem acentos, anos, exportação, referências, camadas, rejeição de anos inválidos e funcionamento da legenda sem sobrepor os créditos. As capturas finais foram inspecionadas em `test-results/meriti-20261003-005153/`.

A revisão adversarial com Astra High encontrou e levou à correção dos testes antigos do Rio, das referências incompletas da exportação e da atribuição OSM. A inspeção visual levou à legenda recolhível e à redução do preenchimento da seleção, que encobria a simbologia das evidências. Também foram corrigidos pedidos repetidos de camadas, cancelamento de respostas obsoletas e o agrupamento institucional do Cemaden.

Os arquivos originais do Rio foram preservados. A adaptação está na branch local `codex/sao-joao-de-meriti`. Nenhuma publicação na Vercel ou alteração remota foi realizada nesta entrega.

## Extensão com imagens recentes e patrimônio natural

O pedido seguinte manteve o protocolo das três fases e a decisão de não criar pontuações. Na coleta, foram identificadas cenas Sentinel-2 C1 L2A e serviços oficiais INEA de unidades de conservação e hidrografia BC25. O cadastro recuperado contém cinco APAs e o Parque Natural Municipal Jardim Jurema, total de seis unidades. Os polígonos oficiais dispensaram inferência por Google Maps. Consultas, metadados, datas e hashes foram preservados; respostas redundantes não foram somadas ao produto.

Na curadoria, seis cenas de 05/08 a 01/10/2026 foram recortadas e processadas a 10 m, com aplicação de escala e deslocamento radiométricos, máscara SCL e mediana de NDVI. A cobertura municipal com pelo menos três observações válidas é 99,9477%. Cinco setores abaixo de 95% de cobertura ficaram sem mediana e sem percentuais de sinal vegetal. Os limiares 0,3, 0,4 e 0,5 mostram sensibilidade e não são fração de copas ou intervalo de confiança. Não houve validação independente de acurácia.

A hidrografia foi recortada com 500 m de contexto para conservar rios de divisa. Canais coincidentes foram usados apenas como classificação; repetições dentro da drenagem também foram dissolvidas, preservando IDs de origem. O produto final possui dez feições multipartes sem duplicação linear residual e nove massas de água. Os seis marcadores de áreas protegidas são pontos internos dos polígonos, não entradas. A densidade passou a ser apresentada nos 809 setores, mantendo população e áreas observadas.

Na implementação, o mapa oferece 13 camadas, incluindo imagem Sentinel-2 datada, sinal vegetal, unidades protegidas, rios/canais e massas de água. O catálogo contém 29 fontes, das quais 15 promovidas, 12 diferidas e duas rejeitadas. Ressalvas estão em ícones acessíveis por mouse, teclado e toque. O cartão exporta os indicadores recentes e oferece download da metodologia completa. A série MapBiomas continua independente do retrato Sentinel-2 de 2026.

A revisão adversarial Astra High identificou duplicação interna dos rios, ordem incorreta da imagem de referência e formato divergente na recuperação de metadados INEA. Os três problemas foram corrigidos. A recuperação foi conferida com GET real nos cinco serviços de metadados, reproduzindo os cinco hashes originais. Os testes de navegador também levaram à correção da navegação para o catálogo, do fechamento de informações durante rolagem e dos popups no celular.

Validação final da extensão em 03/10/2026. As verificações geográficas passaram; a análise estática e o build passaram. Os 19 testes unitários foram aprovados, com repetição dos conjuntos afetados após correções. Os oito testes de navegador passaram em computador e celular. As capturas inspecionadas estão em `test-results/meriti-20261003-015809/`, incluindo imagem de referência sob as evidências e popup legível dentro do mapa. A revisão adversarial final foi aprovada. A prévia local permanece na porta 3108; não houve publicação remota.

## Ampliação da pesquisa de vegetação em 03/10/2026

Na fase 1, foram coletados CHMv2 Meta/WRI, imagem INPE/CBERS-4A WPM de 26/04/2026 e cenas Sentinel-2 de cada mês de 2025. A investigação distinguiu o ano de publicação do CHMv2, 2026, da aquisição local, 16/09/2019. Cenas CBERS com nuvens, sombras ou sem dados locais foram preservadas como candidatas rejeitadas. O catálogo passa a 32 fontes, das quais 18 promovidas, 12 diferidas e duas rejeitadas.

Na fase 2, foram calculados limiares de altura com área elipsoidal, cruzamento CHMv2/MapBiomas do mesmo ano e frequência espectral de 12 aquisições mensais. O cruzamento encontra 85,1833% dos candidatos de altura ≥3 m na classe urbana, sem tratá-los como árvores confirmadas ou como avaliação de erro do MapBiomas. A recorrência municipal ≥80% das datas corresponde a 14,7762% dos pixels elegíveis. Nenhuma das medidas foi convertida em fração vegetal validada.

Victor definiu toda a vegetação viva como medida principal, distinguindo árvores quando possível. Foi registrada uma amostra probabilística de 400 células, com frações ainda vazias, estimador de área com correção de população finita e ficha cega. A revisão adversarial Astra High pediu data-alvo inequívoca. Ela foi fixada em 01/10/2026 antes de qualquer anotação, preservando locais, pesos, hashes e o desenho anterior. Referências de outras datas exigem estabilidade temporal documentada. A coleta/curadoria desses insumos está concluída; a interpretação independente e a estimativa validada da cobertura permanecem pendentes.

Na fase 3, quatro camadas foram adicionadas, total de 17. O cartão distingue altura modelada, recorrência e validação pendente; a exportação preserva essas distinções. Há downloads da ficha v3, das células cegas e do protocolo. A legenda CHM e o raster compartilham a definição das classes. O build foi restringido à pasta do projeto e a rota de downloads passou a declarar arquivos fixos, evitando incluir o projeto inteiro no rastreamento de produção.

A análise estática, os 19 testes da aplicação, os 11 testes do estimador, a validação geográfica ampliada e o build passaram. Os oito testes de navegador passaram em computador e celular em `test-results/meriti-20261003-023535/`. A revisão científica e de integração Astra High foi aprovada. As melhorias visuais ficam na branch isolada `codex/meriti-ui-review`, com os mesmos dados, para avaliação separada. Nenhuma publicação remota foi realizada.


## Rodada de conferência e publicação, 03/10/2026

Fase 1. Foram recuperados 14 arquivos primários do IBGE sobre arborização no entorno, a cena CBERS-4A/WPM L4 de 02/07/2026 e metadados das coleções WPM. Fontes, datas e hashes preservados. Não houve redistribuição das imagens Esri.

Fase 2. Os agregados foram reconciliados por código oficial, mantendo três setores ausentes e um com moradores suprimidos. A evidência de campo confirma presença histórica de árvores em 761 dos 806 setores pesquisados. Foram preparados 400 painéis em cada uma das três referências CBERS. O piloto de 16 células e o diagnóstico de alinhamento não aprovaram frações quantitativas. Zero rótulos aceitos, sem alteração da amostra ou estimador.

Fase 3. A camada de arborização do IBGE e os indicadores territoriais foram integrados, somando 18 camadas. A página /validacao publica a auditoria e os 400 painéis de julho. Imagens e geometrias passaram a entrega estática, preservando os bytes. O projeto Vercel meriti-nbs-explorer foi criado separado do Rio e vinculado à branch codex/sao-joao-de-meriti. A versão de interface permanece em codex/meriti-ui-review.

A revisão adversarial Astra High encontrou um acesso a registros nulos que poderia derrubar a seleção de três setores. Tipos, renderização e teste de regressão foram corrigidos. Ela também conferiu dicionários oficiais, hashes dos 400 painéis, datas, resoluções e licença. A validação da fração vegetal segue pendente de referência espacial adequada e interpretação independente; publicação do site não altera esse estado científico.
