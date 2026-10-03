# Continuar a pesquisa em outro computador

Pacote de transferência preparado em 03/10/2026 para o Explorador de SBN de São João de Meriti. O site publicado está em https://meriti-sbn-explorer.vercel.app/. O repositório público está em https://github.com/lohanamello/meriti-sbn-explorer.

## 1. Receber e abrir o projeto

Instale Git e Node.js 20.9 ou posterior. Clone o repositório, em vez de copiar apenas os arquivos da Vercel.

```sh
git clone https://github.com/lohanamello/meriti-sbn-explorer.git
cd meriti-sbn-explorer
npm ci
npm run dev
```

Abra http://localhost:3000. O site usa os produtos já curados. Não precisa dos 29 GB externos para funcionar nem para examinar os materiais da validação. `npm run build` gera a versão de produção. As dependências JavaScript estão fixadas em `package-lock.json`.

A interface aprovada já está na branch `main`; não é necessário trocar de branch para usá-la. Para atualizar uma cópia existente, salve ou faça commit das suas alterações locais, selecione `main` e execute `git pull --ff-only`, depois `npm run dev`.

Este projeto utiliza a Vercel `meriti-sbn-explorer` e o repositório `lohanamello/meriti-sbn-explorer`, com produção a partir de `main`, framework Next.js e comando `npm run build`. A configuração de build está em `vercel.json`. Para ativar atualizações automáticas a cada envio ao GitHub, conecte a conta GitHub em Vercel → Authentication e depois vincule este repositório ao projeto Vercel. Também é possível publicar a versão local com `vercel deploy --prod --scope sbn8`. O site não requer chaves privadas de fontes de dados.

## 2. Conferir o que foi recebido

Com Python 3.10 ou posterior instalado, execute na raiz:

```sh
python scripts/meriti/archive.py verify
python scripts/meriti/archive.py list
```

O primeiro comando verifica tamanho e SHA-256 dos 1.725 arquivos incluídos no manifesto. O manifesto não inclui a si próprio, o código ou a documentação, que são versionados pelo Git. O segundo lista os 12 arquivos externos. O inventário cobre todos os arquivos de `data/` existentes no momento da transferência, incluindo materiais históricos do Rio.

O pacote de dados tem 598.258.661 bytes antes da compressão. Os arquivos externos somam 29.029.046.925 bytes, aproximadamente 27,04 GiB. Nenhum arquivo externo é baixado automaticamente ao abrir o site.

Os hashes dos arquivos incluídos foram calculados sobre os bytes locais na preparação desta cópia. Os hashes dos arquivos externos foram conservados dos recibos da aquisição original, com o tamanho local conferido, sem reler os 29 GB nesta transferência. A recuperação volta a conferir tamanho e SHA-256 integralmente.

O Git preserva os bytes dos dados, inclusive as quebras de linha, por `.gitattributes`. Não abra e salve CSVs de referência em programas que alterem codificação ou separadores antes dessa conferência. Faça cópias para novas análises. Depois de uma curadoria nova, diferenças em relação ao manifesto congelado podem ser legítimas, mas devem ser documentadas e versionadas como uma nova versão, sem apagar a referência original.

## 3. Onde estão os materiais

| Conteúdo | Caminho |
| --- | --- |
| Metodologia principal | `docs/methodology/meriti.md` |
| Protocolo das três fases | `docs/phases/meriti-execution.md` |
| Desenho da validação e estimador | `docs/methodology/meriti-vegetation-validation-plan.md` |
| Auditoria de imagens e lacunas | `docs/methodology/meriti-validation-reference-audit.md` |
| Arborização observada pelo IBGE | `docs/methodology/meriti-vegetation-field-evidence.md` |
| Bairros e digitalização do atlas | `docs/methodology/meriti-neighborhoods-research.md` |
| Catálogo de Meriti | `data/catalog/meriti/dataset-inventory.csv` |
| Produtos do mapa | `data/processed/meriti/` |
| Fontes e recibos de coleta | `data/raw/meriti/` e demais pastas de `data/raw/` |
| Intermediários | `data/interim/meriti/` |
| Amostra registrada e fichas | `data/processed/meriti/validation/` |
| Imagens de julho, abril e setembro | `data/interim/meriti/independent-reference-audit/` |
| Painéis PAN, RGB e falsa cor de julho | `data/interim/meriti/independent-reference-audit/CBERS_4A_WPM_20260702_198_142_L4/` |
| Valores digitais originais CBERS de julho | `data/raw/meriti/independent_reference_audit_20261003/` |
| Inventário de transferência e recuperação | `data/archive-manifest.json` |
| Código da coleta, curadoria e validação | `scripts/meriti/` |

As imagens e documentos pequenos estão versionados mesmo quando regras gerais de `.gitignore` excluem novos arquivos brutos. Para adicionar um novo insumo, examine tamanho, licença e conteúdo antes de incluí-lo explicitamente no Git. Não adicione `.venv`, `node_modules`, `.next`, credenciais ou rasters nacionais ao repositório.

## 4. Estado dos resultados e próximos passos

A pergunta principal é a fração de **toda vegetação viva** na data-alvo de 01/10/2026, com fração de copas separada quando possível. Não há uma porcentagem municipal validada dessa quantidade. Há zero rótulos quantitativos aceitos e zero células com dupla interpretação independente. A documentação registra o piloto de IA como piloto, separado da referência humana.

Os 400 painéis de julho foram preparados para a amostra probabilística já registrada. Também estão preservados os recortes de abril e setembro. Não sorteie novamente as células para substituir áreas difíceis, não preencha sombra como ausência de vegetação e não use NDVI, CHM ou MapBiomas como verdade de referência do próprio modelo avaliado.

Para iniciar a revisão, entregue aos intérpretes a ficha `data/processed/meriti/validation/review-blinded-v3.csv`, as células `sample-cells-blinded.geojson` e as referências de imagem adequadas. Use cópias separadas para cada pessoa. O repositório contém também o desenho completo e os valores dos modelos para reprodução; os intérpretes não devem consultá-los durante a classificação cega. O simples acesso a uma imagem não dispensa verificar data, nuvens, sombras, alinhamento e capacidade de distinguir plantas pequenas. Consulte o protocolo antes de preencher campos ou calcular uma estimativa.

Os dados de campo do IBGE encontram árvores em 761 dos 806 setores com informação publicada, e 219.493 de 440.574 moradores estão em faces com arborização. Esses números descrevem presença observada e moradores, não área de copas. O sinal Sentinel-2 também não é uma medida direta da fração vegetal dentro dos pixels. A altura de copas CHMv2 corresponde a uma imagem de 2019, apesar da publicação posterior do modelo.

Os indicadores territoriais continuam associados às divisões do IBGE. Cinco limites de localidades derivados do atlas são aproximados e Vila São João é apenas um ponto de referência. Não há estatísticas redistribuídas para essas localidades. As áreas sem classe no mapa de suscetibilidade do SGB permanecem sem classificação, não recebem baixo risco.

## 5. Ambiente científico

O ambiente de referência usou Python 3.10.6 em Windows. As versões observadas estão em `scripts/meriti/requirements-lock.txt`; as dependências diretas estão em `requirements.txt`.

Windows PowerShell, sem precisar ativar o ambiente:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r scripts/meriti/requirements-lock.txt
.venv\Scripts\python.exe scripts/meriti/validate.py
.venv\Scripts\python.exe -m unittest discover -s scripts/meriti -p "test_*.py"
```

Linux ou macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/meriti/requirements-lock.txt
.venv/bin/python scripts/meriti/validate.py
.venv/bin/python -m unittest discover -s scripts/meriti -p 'test_*.py'
```

O verificador científico confere produtos, população, topologia, camadas, máscaras de satélite, amostra e hashes. Ele pode rodar com os arquivos já incluídos. Passar nesse verificador confirma consistência do pacote; não transforma a cobertura vegetal em estimativa validada por referência independente.

Os atalhos `npm run collect:meriti`, `curate:meriti` e `validate:meriti` usam o caminho de Python do Windows. Em outros sistemas, chame os scripts com `.venv/bin/python`, como acima. A reprodução em outra plataforma pode mudar serialização de formatos geoespaciais. Registre versões e compare significado, geometria e valores, além dos hashes. A cópia congelada permite conferir exatamente os bytes distribuídos.

Para testar a aplicação:

```sh
npm run lint
npm test
npm run build
```

Os testes de navegador estão em `tests/e2e/`. Precisam da instalação do Chromium pelo Playwright e usam a porta 3107. Consulte `playwright.config.ts` antes de executá-los.

## 6. Recuperar os grandes originais

Cada entrada externa registra URL da fonte, caminho exato, tamanho, SHA-256 e recibo de aquisição. Para um arquivo específico:

```sh
python scripts/meriti/archive.py fetch --path data/raw/meriti/sgb__meriti_sig__2015/susceptibility.zip
```

O comando preserva arquivos existentes, confere a resposta e só promove o download ao nome esperado depois de verificar tamanho e hash. Em falhas, preserva o arquivo parcial com sufixo `.download-<id>`. Não o adiciona ao Git. Se a fonte mudou, não atualize o hash para esconder a divergência; preserve a versão nova separadamente e documente a mudança.

Para tentar recuperar todos os originais externos, reserve pelo menos 30 GB adicionais, mais espaço de trabalho para descompactação:

```sh
python scripts/meriti/archive.py fetch --all-external
python scripts/meriti/archive.py verify --require-all
```

O pacote CEM de 2022 usa uma página pública do Google Drive e exige download manual pelo link registrado no manifesto. Salve o ZIP original no caminho indicado. O comando de recuperação informa essa pendência e continua os demais downloads, mas termina com erro enquanto ela existir. `verify --require-all` só passa quando todos os arquivos originais estiverem presentes e íntegros. Disponibilidade futura dos servidores externos não é garantida.

## 7. Refazer a curadoria sem perder a referência

Faça uma branch de pesquisa antes de alterar os produtos. Recupere primeiro os arquivos externos exigidos pela etapa escolhida. Os grandes rasters MapBiomas de 2019 a 2023 e a malha estadual IBGE são usados pela curadoria territorial. Não é necessário baixá-los para interpretar as imagens já incluídas.

A sequência de reconstrução de Meriti usa o ambiente virtual criado na seção 5. No Windows PowerShell:

```powershell
.venv\Scripts\python.exe scripts/meriti/curate.py
.venv\Scripts\python.exe scripts/meriti/satellite.py
.venv\Scripts\python.exe scripts/meriti/environment.py
.venv\Scripts\python.exe scripts/meriti/supplemental_sources.py --source all
.venv\Scripts\python.exe scripts/meriti/seasonality.py
.venv\Scripts\python.exe scripts/meriti/field_evidence.py
.venv\Scripts\python.exe scripts/meriti/derive_neighborhoods.py
.venv\Scripts\python.exe scripts/meriti/build.py
.venv\Scripts\python.exe scripts/meriti/validate.py
```

No Linux ou macOS:

```sh
.venv/bin/python scripts/meriti/curate.py
.venv/bin/python scripts/meriti/satellite.py
.venv/bin/python scripts/meriti/environment.py
.venv/bin/python scripts/meriti/supplemental_sources.py --source all
.venv/bin/python scripts/meriti/seasonality.py
.venv/bin/python scripts/meriti/field_evidence.py
.venv/bin/python scripts/meriti/derive_neighborhoods.py
.venv/bin/python scripts/meriti/build.py
.venv/bin/python scripts/meriti/validate.py
```

Essa sequência regrava produtos derivados. Os scripts podem consultar serviços públicos quando faltam arquivos de entrada; restaure a versão congelada antes para reproduzir a base. Consultas remotas novas podem retornar dados diferentes. Registre datas, versões, alterações e seus efeitos, conservando os recibos anteriores. A etapa de bairros usa o PDF do atlas incluído e os pontos de georreferenciamento documentados; não adota os limites como cadastro oficial.

As imagens de referência usam `scripts/meriti/reference_audit.py`, com comandos e critérios descritos na auditoria. O estimador e a ficha usam `validation_sampling.py`; consulte `--help` e o protocolo. Não execute `generate` para substituir a amostra registrada. A nova evidência deve ser incorporada seguindo as três fases de coleta, curadoria e apresentação, com limitações registradas antes de promover conclusões.

Consulte também o [registro da publicação](PUBLICACAO.md) para os testes efetivamente executados, as limitações da reprodução entre plataformas e os avisos conhecidos das dependências antes de uma nova implantação.

## 8. Registrar e citar a continuação

Crie uma branch para seu trabalho, mantenha as fichas de interpretação originais e registre quem analisou cada célula, data da imagem e decisão de adjudicação. Não publique dados pessoais de participantes sem autorização. Guarde resultados aceitos e pendências separadamente.

Ao citar, informe o commit usado do repositório público, a data de acesso, os documentos metodológicos e as fontes dos produtos. Os dados do Rio são históricos e não substituem o protocolo de Meriti. Os direitos de cada fonte permanecem com seus respectivos titulares; consulte a coluna de licença dos catálogos. O pacote não confere uma licença geral aos documentos de terceiros.
