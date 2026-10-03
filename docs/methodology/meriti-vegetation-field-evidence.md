# Arborização observada em campo pelo IBGE em São João de Meriti

## Resultado e finalidade

O Censo 2022 registrou árvores nas faces de vias de 761 dos 806 setores de Meriti com resultados publicados na Pesquisa Urbanística do Entorno dos Domicílios. Todos os 16 bairros têm faces com árvores. Esta é evidência de campo independente dos modelos de sensoriamento remoto usados no atlas. A fonte permite afirmar a presença histórica de árvores no tecido urbano do município. Ela não fornece a área ocupada pelas copas, nem a fração de toda vegetação viva, nem certifica a situação em outubro de 2026.

Os resultados abaixo foram calculados dos arquivos oficiais completos, preservados localmente, com identificação de variáveis pelo dicionário oficial. A coleta dos arquivos ocorreu em 03/10/2026. [Agregados oficiais do IBGE](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/).

| Universo | Em faces com árvores | Denominador oficial da pesquisa | Percentual | Categoria saltado |
|---|---:|---:|---:|---:|
| Moradores em domicílios particulares permanentes ocupados | 219.493 | 440.574 | 49,8198% | 368 |
| Domicílios particulares permanentes ocupados | 84.373 | 168.715 | 50,0092% | 130 |
| Faces | 3.766 | 9.683 | 38,8929% | 50 |

As três linhas têm denominadores diferentes. O percentual de moradores não é percentual do município coberto por vegetação. O percentual de faces não é ponderado pelo comprimento da via. As categorias de contagem de árvores tampouco permitem reconstruir o número total de árvores, pois a categoria superior é aberta e árvores em canteiro central podem estar associadas a mais de uma face.

## O que foi observado e quando

A metodologia considera árvores na face percorrida e no canteiro central, em áreas de uso comum ou anexos externos a domicílios e condomínios. O porte de referência ultrapassa aproximadamente 1,70 m, independentemente de poda ou quantidade de folhas. O quesito não é um levantamento de gramíneas, vegetação rasteira, toda vegetação de quintais ou área de copa. A referência temporal é a data da visita, em geral entre 20/06/2022 e 31/07/2022, com operações que se estenderam até 28/05/2023. Não há data individual de visita nos agregados aqui utilizados. A publicação alerta que a arborização de 2010 e 2022 não deve ser comparada diretamente, devido à mudança de critério. [Publicação do IBGE, páginas 31–33 e 50–51](https://biblioteca.ibge.gov.br/visualizacao/livros/liv102168.pdf).

A data de divulgação das tabelas utilizadas é 17/04/2025. Os dicionários preservados correspondem à versão disponível no diretório oficial, modificada em 07/05/2025. A publicação de 2025 não torna a observação uma medição de 2025.

## Variáveis, cálculo e cobertura

Cada universo usa um prefixo distinto. Moradores usam `V05200` como denominador, domicílios usam `V05000` e faces usam `V05400`. Em cada grupo, os sufixos 30, 31, 32, 33 e 34 representam, respectivamente, sem árvores, uma ou duas, três ou quatro, cinco ou mais e saltado. A soma das categorias 31 a 33 forma o numerador com árvores. O denominador é o total oficial, incluindo saltado. A taxa de resposta é calculada separadamente por `(total - saltado) / total`.

O universo de 440.574 moradores difere dos 440.962 habitantes totais do município. A pesquisa seleciona setores e domicílios particulares permanentes ocupados. Os 388 habitantes de diferença não são classificados artificialmente como moradores em vias sem árvores. O mesmo vale para a diferença entre os 168.715 domicílios do entorno e o total de domicílios de outros produtos do Censo.

A junção espacial utiliza exclusivamente os códigos oficiais do IBGE, sem distribuir médias municipais entre bairros ou setores. A malha existente do projeto contém 809 setores. Destes, 806 têm registros nas tabelas de entorno. Os códigos `330510905000121`, `330510905000415` e `330510905000435` não têm registro. Eles permanecem sem observação.

O setor `330510905000401` tem supressão `X` em moradores e domicílios. Esses valores permanecem nulos, mesmo que subtrações dos totais pudessem sugerir um valor. A tabela de faces tem dados publicados para esse setor. Assim, a arborização por moradores tem 805 setores com valores numéricos; a informação de faces abrange 806. Em 761 há ao menos uma face com árvores registradas; em 45 nenhuma face teve registro positivo. Este último resultado não demonstra que o setor inteiro era desprovido de árvores, pois o quesito não cobre toda a sua superfície.

## Resultados por bairro

O indicador abaixo divide moradores em faces com árvores pelo universo de moradores da pesquisa de entorno de cada bairro. Todos os denominadores, categorias e quantidades de faces permanecem no arquivo de estatísticas para auditoria.

| Bairro IBGE | Moradores em faces com árvores |
|---|---:|
| Agostinho Porto | 53,19% |
| Centro | 34,51% |
| Coelho da Rocha | 50,19% |
| Éden | 48,08% |
| Engenheiro Belford | 35,68% |
| Jardim Meriti | 57,23% |
| Jardim Metrópole | 54,85% |
| Jardim Paraíso | 53,76% |
| Jardim Sumaré | 60,13% |
| Parque Araruama | 57,74% |
| São Matheus | 23,09% |
| Tomazinho | 36,70% |
| Venda Velha | 50,60% |
| Vila Rosali | 58,67% |
| Vila Tiradentes | 56,18% |
| Vilar dos Teles | 48,94% |

## Contribuição à validação e limites

Há duas afirmações diferentes. A presença histórica de árvores em grande parte dos setores urbanos de Meriti tem observação independente do IBGE. Já a fração da superfície municipal ocupada por vegetação viva, que é o objetivo principal da pesquisa, exige referências capazes de distinguir a vegetação dentro das células amostradas, em data compatível. Estas tabelas atendem à primeira afirmação.

Usar o percentual do entorno como verdade por pixel produziria erro de escala. Uma única árvore permite classificar uma face como arborizada, sem cobrir toda a rua, todo o lote ou todo o setor. Um setor sem registro positivo também pode conter vegetação em terrenos e espaços fora do quesito. Por isso não se calculou matriz de confusão dos pixels Sentinel-2 contra esses totais, não se inferiu cobertura de copa e não se usou esta fonte para preencher as 400 interpretações de referência da amostra de área.

O dado também não prova perda ou ganho entre 2022 e 2026. As diferenças de data, universo e variável impedem ler uma diferença de percentual como desmatamento, reflorestamento ou erro do MapBiomas.

## Arquivos e reprodução

- `scripts/meriti/field_evidence.py` baixa os agregados de moradores, domicílios e faces em quatro níveis oficiais, registra URLs e SHA-256, recorta exclusivamente códigos iniciados por `3305109` e confere totais.
- `data/raw/meriti/ibge__entorno_arborizacao__2022/` preserva 12 arquivos ZIP nacionais, o ZIP de dicionários, a publicação metodológica e `provenance.json` com os respectivos hashes. Não contém microdados pessoais.
- `data/interim/meriti/field-evidence/` contém 12 recortes CSV de Meriti, `ibge-arborizacao-statistics.json` com 829 territórios e `ibge-arborizacao-setores.geojson` com 809 polígonos.
- Os percentuais do GeoJSON são `residentsWithTreesPct` e `facesWithTreesPct`. Dados ausentes permanecem `null`. Os polígonos representam setores estatísticos, nunca o desenho das copas ou a localização exata das árvores.
- O script conserva arquivos brutos já registrados e falha se o hash ou URL mudarem. Se o arquivo original mudar no IBGE, a nova aquisição deve receber uma versão distinta.

Reproduzir no ambiente do projeto com `.venv\Scripts\python.exe scripts/meriti/field_evidence.py`. A segunda execução usa os arquivos preservados e verifica seus hashes. Executar os testes com `.venv\Scripts\python.exe -m unittest discover -s scripts/meriti -p test_field_evidence.py`.

Foram verificadas a unicidade dos códigos, a existência de correspondência na malha, a soma das cinco categorias contra cada denominador completo e a reconciliação de bairros, distritos e setores contra os agregados municipais. Somas com supressões são registradas como somas de valores conhecidos, sem imputar células ausentes. Testes específicos verificam o denominador com saltado, a preservação de `X`, a ausência de percentual quando o denominador é zero e a rejeição de contagens incoerentes.
