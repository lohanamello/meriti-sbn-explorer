# Registro da publicação pública

Preparação em 03/10/2026. A finalidade desta publicação é transferir a pesquisa e o código para outro computador sem depender do histórico privado ou da instalação original.

## Base e integridade

A versão principal está na branch `main` deste repositório, com histórico iniciado na publicação inicial do projeto. Os dados incluídos e externos estão em `data/archive-manifest.json`. A transferência conserva o conteúdo científico e acrescenta guia de continuidade, recuperação de arquivos externos, ambiente Python congelado e testes da transferência.

Foram corrigidos dois problemas de portabilidade do código de coleta. A inicialização do catálogo agora preserva fontes complementares já promovidas; os recibos antigos com separadores de caminho do Windows passam a ser lidos em outras plataformas.

A interface aprovada integra a versão principal. A publicação utiliza o projeto Vercel `meriti-sbn-explorer` e a branch `main`.

## Verificações da cópia independente

- Instalação JavaScript nova com `npm ci`, sem reutilizar `node_modules` do projeto original.
- Conferência de tamanho e SHA-256 dos 1.725 arquivos incluídos, sem divergências.
- Recuperação real da malha com agregados do IBGE, 75.198.464 bytes, seguida de conferência integral de SHA-256. Esse original externo permanece fora do Git.
- 26 testes da aplicação, análise estática e build de produção aprovados.
- 25 testes Python aprovados, incluindo os 16 científicos anteriores, sete de recuperação e dois de portabilidade.
- Verificação geoespacial aprovada para territórios, conservação populacional, topologia, 19 camadas, seis áreas protegidas, máscaras, amostra registrada e hashes dos produtos.
- Busca automatizada de padrões de credenciais em 476 arquivos de texto, sem ocorrências dos padrões verificados. Isso não constitui garantia universal de ausência de segredos.
- Revisão adversarial independente. A instrução de reconstrução foi corrigida para usar explicitamente o Python do ambiente virtual.

Os testes Python e geoespaciais utilizaram o interpretador e as dependências da instalação original, executando os scripts e lendo os dados da cópia independente. Não foi criada uma segunda instalação Python nem testada uma instalação Linux ou macOS. O arquivo `requirements-lock.txt` registra o ambiente de referência. A curadoria completa dos rasters nacionais não foi repetida nesta transferência. Os hashes dos grandes originais conservam os recibos da coleta anterior.

Essas verificações confirmam a transferência e a consistência computacional. A fração de toda vegetação viva continua aguardando referência quantitativa e interpretação independente, conforme o protocolo.

## Avisos conhecidos de dependências

A instalação reproduz o `package-lock.json` do projeto. `npm audit` registrou 22 avisos, sendo um baixo, quatro moderados, 14 altos e três críticos. O [relatório integral](dependency-audit-20261003.json) inclui os identificadores, componentes e versões afetadas. Os componentes diretos com classificação crítica são Next.js, MapLibre GL JS e Vitest. A contagem é do grafo de dependências, não de vulnerabilidades demonstradas na aplicação.

Esta publicação não corrige esses avisos, não constitui liberação de segurança e não atesta que cada condição de exploração esteja presente. O teste funcional e o build passaram, mas não substituem a atualização e a avaliação de segurança antes de uma nova implantação. Não exponha servidores de desenvolvimento e de testes na rede pública. A atualização deve ser feita em branch própria, com nova verificação do mapa e dos fluxos, preservando os dados científicos e o registro da versão utilizada.
