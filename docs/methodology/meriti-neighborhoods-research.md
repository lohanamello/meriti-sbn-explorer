# Bairros e localidades de São João de Meriti

Consulta em 3 de outubro de 2026. Esta curadoria compara nomes e produz referências de localização. Não muda as unidades do Censo nem atribui indicadores às novas geometrias.

## Comparação com a Prefeitura

A página municipal [A Cidade](https://meriti.rj.gov.br/inicio/a-cidade/) menciona 16 bairros em um parágrafo e cinco centros comerciais que também correspondem a bairros da base existente. A redação indica exemplos, não um cadastro exaustivo. Excluímos o Shopping Grande Rio da contagem porque o estabelecimento não equivale, por si só, a um bairro chamado Grande Rio.

Dos 21 nomes considerados, 15 correspondem aos bairros IBGE da aplicação, com a equivalência de grafia São Mateus/São Matheus. Seis não tinham referência própria no mapa. Jardim Paraíso está na base IBGE, mas não aparece nessa lista municipal. Isso não constitui evidência de sua inexistência.

| Nome na página municipal | Representação anterior | Referência acrescentada |
| --- | --- | --- |
| Agostinho Porto | Polígono IBGE | Mantida |
| Centro | Polígono IBGE | Mantida |
| Coelho da Rocha | Polígono IBGE | Mantida |
| Éden | Polígono IBGE | Mantida |
| Engenheiro Belford | Polígono IBGE | Mantida |
| Jardim Meriti | Polígono IBGE | Mantida |
| Jardim Metrópole | Polígono IBGE | Mantida |
| Jardim Sumaré | Polígono IBGE | Mantida |
| Parque Alian | Ausente como unidade própria | Contorno aproximado do atlas |
| Parque Analândia | Ausente como unidade própria | Contorno aproximado do atlas |
| Parque Araruama | Polígono IBGE | Mantida |
| Parque Novo Rio | Ausente como unidade própria | Contorno aproximado do atlas |
| Parque Tietê | Ausente como unidade própria | Contorno aproximado do atlas |
| São Mateus | Polígono IBGE denominado São Matheus | Mantida, com equivalência de nome |
| Tomazinho | Polígono IBGE | Mantida |
| Venda Velha | Polígono IBGE | Mantida |
| Vila Norma | Ausente como unidade própria | Contorno aproximado do atlas |
| Vila Rosali | Polígono IBGE | Mantida |
| Vila São João | Ausente como unidade própria | Posição aproximada do rótulo, sem perímetro |
| Vila Tiradentes | Polígono IBGE | Mantida |
| Vilar dos Teles | Polígono IBGE | Mantida |

## Fonte cartográfica encontrada

O [Atlas escolar do DAGEOP/UERJ-FFP](https://www.dageop.com.br/sao-joao-de-meriti) declara parceria com a Prefeitura e o Centro de Atividades Comunitárias. O [mapa de bairros e localidades](https://www.dageop.com.br/_files/ugd/bb64e6_32f7cc184ff4443da2efda13778d1b06.pdf) diferencia contornos de bairros e localidades identificadas por texto. Nele, Parque Novo Rio, Parque Analândia, Parque Tietê, Parque Alian e Vila Norma têm contornos próprios. Vila São João aparece em itálico, sem perímetro individual. O rodapé informa base cartográfica do IBGE e sistema geográfico SIRGAS 2000, mas não identifica edição ou data dos limites granulares.

O PDF contém uma única imagem de 4.958 × 3.509 pixels. Seus metadados registram criação em 05/11/2024 às 15h27min43s, UTC−3. Essa data caracteriza o arquivo, não a vigência dos limites. Não foi localizado vetor aberto do atlas. A camada entregue é uma derivação deste documento, e não uma malha legal fornecida pela Prefeitura.

## Evidência administrativa complementar

A [Secretaria Municipal de Assistência Social](https://meriti.rj.gov.br/inicio/secretaria-municipal-de-assistencia-social-4/) relaciona Parque Novo Rio e outras localidades nas áreas atendidas por CRAS e CREAS. Áreas de atendimento podem se sobrepor e a lista não define perímetros administrativos. Por isso não foi usada como uma nova divisão territorial.

A [Lei Complementar 205, publicada no Diário Oficial 5856 de 06/06/2022](https://transparencia.meriti.rj.gov.br/ver20230623/tmp/PortalServices/DOM5856_Leicomplementar205.pdf), registra Parque Novo Rio no cadastro de logradouros, incluindo Avenida Dionísio Rocha e ruas Feira de Santana, Berimbau e Estoril. Também cita a localidade em tabelas de risco. Esses registros corroboram o nome, mas não especificam seu contorno completo. Os mapas de zoneamento e regiões de planejamento não foram confundidos com limites de bairros. O [caderno municipal do Plano Diretor](https://meriti.rj.gov.br/inicio/wp-content/uploads/2024/01/Plano-Diretor.pdf) foi preservado como documento auxiliar.

## Derivação e conferência

O procedimento reprodutível está em `scripts/meriti/derive_neighborhoods.py`.

1. Extrair a imagem original do PDF, sem redimensioná-la.
2. Ajustar transformação linear separada nos eixos usando os três ticks de longitude e dois de latitude impressos no mapa. A projeção equiretangular declarada admite essa transformação. Os pontos e coeficientes ficam em `metadata.json`.
3. Recuperar cinco regiões amarelas conectadas, com sementes manuais dentro dos respectivos contornos. Remover buracos produzidos pelos rótulos e suavizar/simplificar o contorno em dois pixels.
4. Restaurar os trechos ao sul de Parque Novo Rio e Parque Analândia encobertos pelo símbolo da Linha Vermelha, ligando os segmentos visíveis do limite e da divisa municipal. Os vértices dessa intervenção estão explícitos no script. Nenhum caminho foi inferido por divisão de distâncias entre nomes.
5. Transformar SIRGAS 2000 geográfico, EPSG:4674, para WGS84, EPSG:4326. Calcular áreas e interseções em SIRGAS 2000/UTM 23S, EPSG:31983.
6. Posicionar Vila São João no centro aproximado de seu rótulo. Esse ponto não representa centroide territorial, endereço ou entrada, e não recebe área ou indicadores.
7. Conferir validade geométrica, ausência de sobreposição entre os cinco contornos e interseções com todos os bairros IBGE. Não forçar correspondência com apenas um bairro.

A dimensão gráfica do pixel equivale aproximadamente a 2,35 m leste-oeste e 2,53 m norte-sul. Isso mede resolução do desenho, não exatidão do limite. A suavização e a simplificação usam parâmetros de dois pixels. Esses parâmetros não garantem um limite de erro, especialmente nos trechos restaurados manualmente. Não foi aferida uma tolerância máxima da extração.

Compararam-se 12 posições da divisa municipal reconhecíveis no desenho, separadas dos ticks usados no ajuste, com a divisa IBGE 2022. A distância mediana à linha IBGE foi 7,60 m e a máxima 20,53 m. A verificação apoia a compatibilidade do posicionamento. Não é validação de campo independente, já que o atlas cita IBGE como base, e não comprova precisão de todos os limites internos. Pontos, distâncias e ressalva constam em `metadata.json`.

## Relação espacial encontrada

As proporções abaixo resultam da sobreposição dos contornos aproximados com a malha IBGE. Não são proporções de população nem indicadores locais.

| Referência do atlas | Bairros IBGE intersectados |
| --- | --- |
| Parque Alian | Coelho da Rocha 73,38%; Vilar dos Teles 26,62% |
| Vila Norma | Éden aproximadamente 100% |
| Parque Tietê | Jardim Sumaré 50,46%; Parque Araruama 49,54% |
| Parque Novo Rio | Parque Araruama 88,13%; Jardim Sumaré 11,22%; Centro 0,41%; Venda Velha 0,23% |
| Parque Analândia | Parque Araruama 70,37%; Jardim Sumaré 29,63% |
| Vila São João | Rótulo localizado dentro de Vilar dos Teles |

Portanto, o atlas não representa simplesmente cinco cortes adicionais dentro dos polígonos IBGE atuais. Há divergências de desenho e de divisão. Interseções pequenas podem refletir generalização ou diferença entre bases. A aplicação deve apresentar referências locais e unidades estatísticas de forma separada, sem copiar a densidade ou a vegetação de um bairro inteiro para uma localidade.

## Arquivos e reprodução

- Documentos consultados e seus SHA-256 ficam em `data/raw/meriti/municipal_neighborhoods__2026/provenance.json`.
- `data/interim/meriti/municipal-neighborhoods/atlas-neighborhoods.geojson` contém cinco polígonos e um ponto, com fonte e nota por feição.
- `atlas-pixel-traces.geojson` preserva os contornos no espaço de pixels para auditoria.
- `metadata.json` preserva controles, método, limites de interpretação e verificação de registro.
- `atlas-digitization-review.png` permite comparar os contornos derivados com o documento original.
- `atlas-ibge-comparison.png` mostra os contornos derivados em magenta e a malha IBGE em azul.

O Google Maps não foi necessário para essa derivação. Não foram copiados limites do Google, nem transformados rótulos sem perímetro em polígonos. A figura do atlas não é usada como fundo do aplicativo. A fonte e a autoria acompanham os dados derivados; não se atribui licença aberta ao documento original sem declaração do titular.

## Integração no mapa

A camada publicada preserva cinco contornos e um ponto. Somente para exibição, os polígonos são recortados pelo limite municipal IBGE 2022, removendo a pequena sobra externa causada pela generalização cartográfica. O contorno original permanece no arquivo intermediário e as proporções de interseção acima se referem a ele. O recorte de exibição não resolve divergências internas nem altera o nível de precisão da fonte. A propriedade `displayClippedToIbgeMunicipality` registra essa operação.

O atlas e o IBGE são referências distintas. A seleção de uma localidade abre seu próprio cartão, sem população ou percentuais de vegetação. O usuário pode consultar, por botão explícito, os indicadores de cada bairro IBGE intersectado. Clicar nas referências do atlas não muda o recorte de setores ou distritos. Os 16 bairros e 809 setores do Censo, suas somas e indicadores permanecem inalterados.

O [painel municipal da Covid](https://meriti.rj.gov.br/covid/dist/index.php), com atualização declarada em 11/03/2023, também utiliza nomes mais detalhados. A inspeção de seu mapa encontrou o polígono municipal e marcações locais, sem uma malha de polígonos de bairros para reaproveitar. A tabela de localidades não foi convertida em divisas.

A interface permite baixar este documento em `/api/bairros/metodologia` e o GeoJSON publicado em `/meriti/evidence/layers/local-neighborhoods.geojson`. O inventário identifica a fonte como `dageop__meriti_bairros_localidades__2024`, com 2024 significando criação do PDF, não vigência das divisas.
