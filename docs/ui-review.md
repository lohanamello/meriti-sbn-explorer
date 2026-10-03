# Interface de Meriti

Interface aprovada e integrada à branch `main` em 03/10/2026. Execute `npm run dev` e abra http://localhost:3000. O selo de prévia e o link de comparação foram retirados da interface principal. A integração conserva os dados, métodos e materiais da pesquisa. A produção utiliza a branch `main` deste repositório e o projeto Vercel `meriti-sbn-explorer`. Os registros de testes abaixo descrevem a revisão original; a transferência pública está documentada em [PUBLICACAO.md](PUBLICACAO.md).

| Before | After | Why |
| --- | --- | --- |
| Cartões largos ocupam parte da largura do mapa | Controles de 252 px e resultados de 328 px, mapa ocupando o espaço restante em computador | Ampliar a área de inspeção geográfica |
| Combinação de camadas feita em várias caixas de seleção | Seis atalhos, com data ou fonte explícita e estado pressionado | Comparar rapidamente vegetação recente, CBERS, copas de 2019, recorrência de 2025, rios e densidade |
| Navegação longa até o mapa no celular | Mapa antes dos controles, seguido pelos indicadores | Colocar a inspeção territorial no início da página |
| Várias caixas e superfícies dentro dos painéis | Divisórias simples, cor de seleção e rolagem independente em computador | Reduzir a repetição de molduras e manter o mapa visível |


A revisão da interface preservou datas, fontes, limitações, cálculos, geometrias e fichas científicas. Os atalhos apenas selecionam conjuntos de camadas. A decisão de não usar pontuação composta permanece.

## Verificação

Em 03/10/2026, a análise estática, 19 testes unitários e build de produção passaram. Os dez testes de navegador passaram em computador e celular. Eles incluem os oito cenários funcionais da versão principal e o cenário adicional de comparações e validação em dois tamanhos de tela. Capturas em `test-results/meriti-20261003-024224/`.

A primeira rodada encontrou compressão vertical dos painéis no celular, com sobreposição que bloqueava cliques. O fluxo responsivo foi corrigido antes da rodada aprovada. A inspeção visual também corrigiu o contraste do distrito no território selecionado e aumentou o texto das camadas. As imagens de referência foram examinadas após o download completo.

A validação geográfica passou também neste worktree, incluindo todos os hashes. O Git preserva os bytes dos dados científicos sem converter quebras de linha. A revisão adversarial Astra High aprovou o código, a integração científica e a apresentação em computador e celular.


## Integração na main

Em 03/10/2026, a interface aprovada foi promovida à versão principal. Foram retirados o selo de prévia e o link de comparação. O README e o guia de continuidade passaram a orientar o uso direto da `main`.

A análise estática, os 26 testes unitários e o build de produção passaram. Dos dez cenários de navegador, oito passaram na primeira execução. Os dois cenários territoriais ainda esperavam os textos e contagens anteriores à inclusão das localidades do atlas. Foram atualizados para conferir 16 bairros do IBGE, cinco contornos aproximados, um ponto de referência e a quinta camada da legenda após ativar a hidrografia OSM. As verificações dos três distritos, dos 809 setores, das fontes e da apresentação foram mantidas. Os dois cenários passaram novamente em computador e celular, sem aumentar limites de tempo ou reduzir verificações.

Os arquivos de dados, os scripts científicos e os documentos metodológicos não sofreram alterações nesta integração. O envio ao GitHub não altera a configuração anterior de publicação na Vercel.
