# Explorador de SBN de São João de Meriti

Código, documentação, métodos, dados curados, imagens de satélite recortadas e materiais de validação para continuar a pesquisa em outro computador.

- [Abrir o site](https://meriti-sbn-explorer.vercel.app/)
- [Começar ou continuar a pesquisa](docs/CONTINUAR-PESQUISA.md)
- [Metodologia de Meriti](docs/methodology/meriti.md)
- [Registro das três fases](docs/phases/meriti-execution.md)
- [Protocolo da validação vegetal](docs/methodology/meriti-vegetation-validation-plan.md)
- [Auditoria das imagens e pendências da validação](docs/methodology/meriti-validation-reference-audit.md)
- [Bairros, localidades e limites aproximados](docs/methodology/meriti-neighborhoods-research.md)

A interface aprovada foi integrada à `main`. O [registro da interface](docs/ui-review.md) descreve as mudanças.

## Abrir no computador

Instale Git e Node.js 20.9 ou posterior. Ambiente usado na publicação: Node.js 24.14.0.

```sh
git clone https://github.com/lohanamello/meriti-sbn-explorer.git
cd meriti-sbn-explorer
npm ci
npm run dev
```

Abra http://localhost:3000. O preparo das imagens e das camadas públicas é automático. Não é preciso baixar os arquivos nacionais de dezenas de gigabytes nem configurar credenciais para abrir o site. O mapa-base requer internet; os produtos da pesquisa estão no repositório.

## O que está publicado

A branch `main` contém a versão principal com a nova interface. O histórico deste repositório começa com a versão inicial do projeto. Os dados e métodos estão documentados junto ao código.

O mapa reúne 19 camadas, 16 bairros do IBGE, três distritos, 809 setores censitários, seis referências de localidades adicionais, unidades de conservação, hidrografia e indicadores ambientais. Cinco localidades têm limites aproximados derivados de atlas; Vila São João tem apenas um ponto de referência. Não recebem indicadores inventados a partir dos bairros do IBGE. Não há pontuação composta ou ranking.

Estão incluídos 1.725 arquivos de dados, cerca de 598 MB antes da compressão, com recortes GeoTIFF, imagens de interpretação, tabelas, documentos de origem, intermediários, produtos e recibos de coleta. Os 12 arquivos acima de 40 MiB, cerca de 29 GB decimais, ficam representados pela proveniência, tamanho, hash SHA-256 e caminhos de recuperação. O [manifesto](data/archive-manifest.json) identifica cada arquivo incluído ou externo. Esse limite permite publicar as imagens municipais e deixar fora os grandes arquivos nacionais e estaduais.

## Estado científico

O alvo da pesquisa é toda vegetação viva, distinguindo árvores quando a referência permitir. Os indicadores de satélite e de campo são evidências com resoluções e datas diferentes. Ainda há **zero rótulos quantitativos de fração vegetal aceitos**. Os 400 painéis de julho e os recortes de abril e setembro estão disponíveis para a continuidade da interpretação; sua existência não constitui validação concluída.

Os documentos e produtos do projeto anterior do Rio foram preservados como histórico. Para Meriti, siga os documentos com `meriti` no nome e o guia de continuidade.

## Conferência

```sh
npm run lint
npm test
npm run build
python scripts/meriti/archive.py verify
```

A última linha usa somente a biblioteca padrão do Python 3.10 ou posterior e confere os arquivos de dados recebidos. Para testes científicos, instalação do ambiente Python, recuperação dos arquivos grandes e reprodução da curadoria, consulte o [guia de continuidade](docs/CONTINUAR-PESQUISA.md).

A instalação reproduz as dependências da versão de origem. Há avisos de segurança conhecidos, registrados com as verificações e limitações desta transferência em [PUBLICACAO.md](docs/PUBLICACAO.md).

## Proveniência e direitos

O código e a pesquisa são mantidos neste repositório. O projeto Vercel `meriti-sbn-explorer` utiliza a branch `main` para produção.

Fontes, datas, licenças declaradas e limitações estão nos catálogos e nos documentos metodológicos. Os materiais de terceiros mantêm seus próprios termos. Esta publicação não concede uma licença única sobre todos eles. Cite a versão do repositório, o método e as fontes utilizadas, especialmente INPE/CBERS, IBGE, INEA, SGB, MapBiomas, OpenStreetMap e DAGEOP/UERJ, conforme o produto.

## Implantação

O código desta cópia está em [lohanamello/meriti-sbn-explorer](https://github.com/lohanamello/meriti-sbn-explorer).
O endereço de produção é [meriti-sbn-explorer.vercel.app](https://meriti-sbn-explorer.vercel.app/).
A configuração de instalação e build está em `vercel.json`. A seleção de
arquivos para implantação está em `.vercelignore`; os originais científicos
continuam disponíveis localmente e no manifesto, sem integrar o envio à Vercel.
