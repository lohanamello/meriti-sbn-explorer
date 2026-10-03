from __future__ import annotations

import csv
import json

import geopandas as gpd
import pandas as pd

from collect import ROOT, CATALOG, digest_file, now, save_inventory, write_json
from curate import INTERIM, OUTPUT, LAYERS, IBGE_ID, FLOOD_ID, YEARS, save_layer
from environment import UC_ID, RIVER_ID, CANAL_ID, WATER_ID, prepare as prepare_environment
from satellite import SOURCE_ID as SATELLITE_ID
from vegetation_evidence import publish as publish_vegetation, CHM_ID, CBERS_ID, SEASONAL_ID, SOURCE_IDS
from vegetation_evidence import publish_field_evidence, FIELD_ID
from neighborhoods import SOURCE_ID as NEIGHBORHOOD_ID, register_source as register_neighborhood_source, publish as publish_neighborhoods, LIMITATION as NEIGHBORHOOD_LIMITATION

SANITATION_IDS = ['ibge__bairros_domicilios1__2022', 'ibge__bairros_domicilios2__2022']
LAND_COVER_IDS = [f'mapbiomas__cobertura_uso_solo_10m_tif__{year}' for year in YEARS]
OSM_ID = 'osm__meriti_bbox__snapshot'
LIMITATIONS = [
    'Sem pontuação composta e sem ranking, por decisão do pesquisador.',
    'O SGB classifica 45,84% da área municipal. O restante não tem classe publicada nesta fonte e não deve ser interpretado como baixo risco. Carta de 2015, escala 1:20.000.',
    'MapBiomas 10 m, coleção 2 beta, mapeia classes de cobertura. Não mede toda a arborização de ruas e quintais. A classe urbana não equivale à superfície impermeável.',
    'Esgotamento precário declarado é um mínimo observado no Censo 2022. Há 616 domicílios sem categoria publicada no conjunto de totais utilizado. Rede geral ou pluvial não comprova tratamento de esgoto.',
    'Os 16 bairros são os recortes do IBGE no Censo 2022. Alguns atravessam distritos. Cada divisão foi agregada diretamente dos setores.',
    'Fontes de anos diferentes são exibidas com seus períodos. Só a mesma coleção MapBiomas, no mesmo recorte territorial, permite comparação anual aqui.',
    'Sentinel-2 2026 é uma medição espectral independente da série MapBiomas. NDVI não mede diretamente fração de copas e não recebeu validação de acurácia em campo.',
    'Rios e canais oficiais incluem 500 m de entorno e usam a edição 2018 da BC25. As seis unidades de conservação usam polígonos do cadastro INEA 2024/ICMS 2025.',
    'As classes de solução orientam investigação local. A base não comprova domínio público, capacidade de drenagem, disponibilidade de terreno ou viabilidade de obras.'
]


def percent(value):
    return f'{value:.2f}'.replace('.', ',') + '%'


def legend(colors):
    return [dict(label=label, color=color) for label, color in colors]


def layer(ident, label, family, file, sources, period, resolution, colors, limitation, year_files=None):
    result = dict(id=ident, label=label, family=family, layerFile=f'layers/{file}.geojson', sourceDatasetIds=sources,
                  temporalCoverage=period, resolution=resolution, legend=legend(colors), status='available', limitation=limitation)
    if year_files:
        result.update(timelineReady=True, yearFiles=year_files)
    return result


def indicator_layer(units, column, name, thresholds, colors):
    frame = units.copy()
    frame['overlayColor'] = frame[column].map(lambda value: '#7f8f8b' if pd.isna(value) else colors[0] if value < thresholds[0] else colors[1] if value < thresholds[1] else colors[2])
    return save_layer(name, frame[['id','name',column,'overlayColor','geometry']])


def register_supplemental_sources():
    with CATALOG.open(encoding='utf-8', newline='') as stream:
        rows = list(csv.DictReader(stream))
    fields = list(rows[0])
    known = {row['id'] for row in rows}
    if FIELD_ID not in known:
        field_row=json.loads((INTERIM/'field-evidence/catalog-row.json').read_text(encoding='utf-8'))
        field_row['promotion_status']='promoted'
        rows.append(field_row)
    definitions = [
        (CHM_ID, 'Altura modelada de copas CHMv2', 'Meta / WRI', 'Imagem de 16/09/2019; publicação 2026', 'Grade próxima de 1,1 m no terreno', 'CC BY 4.0', 'Modelo sem validação local; pode confundir edifícios, sombras ou outros objetos. Não mede vegetação atual ou herbácea.'),
        (CBERS_ID, 'CBERS-4A/WPM RGB fusionado de Meriti', 'INPE / CBERS', '26/04/2026', 'PAN 2 m, multiespectral 8 m; RGB fusionado PCA', 'CC BY 4.0', 'Referência visual, sem avaliação quantitativa de nuvens ou acurácia. A data antecede o NDVI recente.'),
        (SEASONAL_ID, 'Sentinel-2, observações mensais de Meriti', 'Copernicus / ESA, distribuição Element 84', 'Janeiro a dezembro de 2025', '10 m; uma aquisição selecionada por mês', 'Copernicus Sentinel data, acesso livre e aberto', 'Recorrência do sinal espectral nas datas selecionadas. Não equivale à fração de vegetação ou confiança estatística.'),
        (SATELLITE_ID, 'Sentinel-2 L2A, recortes recentes de Meriti', 'Copernicus / ESA, distribuição Element 84', '2026-08-05 a 2026-10-01', '10 m; SCL a 20 m', 'Copernicus Sentinel data, acesso livre e aberto', 'Sinal espectral de vegetação, não fração de copas. Sem validação independente de acurácia.'),
        (UC_ID, 'Unidades de conservação municipais de Meriti', 'INEA / Prefeitura de São João de Meriti', 'Cadastro 2024, ICMS Ecológico 2025', 'Polígonos cadastrais e pontos internos', 'Dados públicos; camada sem licença explícita', 'Geometria cadastral oficial. Marcadores são pontos internos, não portarias ou acessos públicos.'),
        (RIVER_ID, 'Hidrografia BC25, Meriti e entorno', 'IBGE / SEA / INEA', 'BC25, edição 2018; consulta 2026', '1:25.000; município e entorno de 500 m', 'Dados públicos; camada sem licença explícita', 'Traçado cartográfico histórico. Não comprova vazão, navegabilidade, qualidade da água ou drenagem atual.'),
        (CANAL_ID, 'Canais BC25, Meriti e entorno', 'IBGE / SEA / INEA', 'BC25, edição 2018; consulta 2026', '1:25.000; município e entorno de 500 m', 'Dados públicos; camada sem licença explícita', 'Geometria histórica. Camada Canal/Vala duplicada foi excluída.'),
        (WATER_ID, 'Massas de água BC25, Meriti e entorno', 'IBGE / SEA / INEA', 'BC25, edição 2018; consulta 2026', '1:25.000; município e entorno de 500 m', 'Dados públicos; camada sem licença explícita', 'Limites cartográficos não representam necessariamente a lâmina de água atual.')
    ]
    for ident,name,institution,period,resolution,license_text,limitation in definitions:
        if ident in known:
            continue
        provenance = json.loads((ROOT/'data/raw/meriti'/ident/'provenance.json').read_text(encoding='utf-8'))
        row = dict.fromkeys(fields,'')
        row.update(id=ident,source_name=name,source_institution=institution,source_url=provenance.get('source_url',provenance.get('sourceUrl')),
                   acquisition_route='public_api_and_geospatial_processing',access_status='public',license=license_text,
                   spatial_coverage='São João de Meriti e entorno declarado',spatial_resolution=resolution,temporal_coverage=period,
                   format='GeoTIFF / PNG' if ident in {SATELLITE_ID,*SOURCE_IDS} else 'GeoJSON',crs='Conforme metadados do produto; visualização EPSG:4326',
                   evidence_family='Vegetação e referência de imagens' if ident in {SATELLITE_ID,*SOURCE_IDS} else 'Patrimônio natural e hidrografia',
                   potential_use='Investigação territorial de SBN, sem ranking.',known_limitations=limitation,
                   raw_storage_path=f'data/raw/meriti/{ident}',collection_status='downloaded',promotion_status='promoted',
                   collected_at=provenance.get('downloaded_at',provenance.get('retrieved_at',provenance.get('retrievedAt',''))))
        rows.append(row)
    save_inventory(fields,rows)


def update_catalog():
    with CATALOG.open(encoding='utf-8', newline='') as stream:
        rows = list(csv.DictReader(stream))
    promoted = {IBGE_ID, FLOOD_ID, *SANITATION_IDS, *LAND_COVER_IDS, OSM_ID, SATELLITE_ID, UC_ID, RIVER_ID, CANAL_ID, WATER_ID,FIELD_ID,NEIGHBORHOOD_ID,*SOURCE_IDS}
    decisions = {
        'ibge__setores_censitarios_malha_rj__2022': ('deferred', 'Malha redundante; o GeoPackage com atributos fornece a geometria usada.'),
        'academic__cem_setores_rm_rio_zip__2022': ('deferred', 'Reúne variáveis básicas do IBGE já incorporadas diretamente da fonte oficial.'),
        'ana__snirh_estacoes_hidrometeorologicas_rj__atual': ('rejected', 'Arquivo preservado contém zero feições. Não comprova ausência de estações.'),
        'osm__meriti__snapshot': ('rejected', 'Consulta pelo código da área retornou zero elementos. Substituída por consulta do envelope recortada pelo IBGE.'),
        'sgb__meriti_base__2015': ('deferred', 'Base preservada em geodatabase pessoal MDB. Não convertida nesta curadoria; hidrografia OSM usada como contexto.'),
        'ibge__domicilios2__2022': ('deferred', 'Tabela de setores preservada. Células suprimidas impedem simples soma; saneamento utiliza os agregados oficiais por bairro.'),
        'sinisa__esgoto__2023': ('deferred', 'Planilhas de prestadores preservadas. Indicadores municipais exigem revisão de cobertura e denominadores e não foram distribuídos entre bairros.'),
    }
    for row in rows:
        if row['id'] in promoted:
            row.update(promotion_status='promoted', notes='Promovido para Meriti; transformação em scripts/meriti, limitações em docs/methodology/meriti.md.')
        else:
            status, explanation = decisions.get(row['id'], ('deferred', 'Documentação ou fonte complementar. Nenhum indicador ou geometria desta fonte foi promovido ao mapa.'))
            row.update(promotion_status=status, notes=(row['notes'] + ' ' + explanation).strip() if explanation not in row['notes'] else row['notes'])
    save_inventory(list(rows[0]), rows)
    provenance = []
    for row in rows:
        if row['id'] in promoted:
            path = ROOT / row['raw_storage_path'] / 'provenance.json'
            provenance.append(dict(datasetId=row['id'], sourceUrl=row['source_url'], rawProvenance=json.loads(path.read_text(encoding='utf-8'))))
    write_json(OUTPUT / 'metadata/provenance-manifest.json', dict(generatedAt=now(), sources=provenance))


def build():
    register_supplemental_sources()
    register_neighborhood_source()
    environmental = prepare_environment()
    satellite = json.loads((INTERIM/'sentinel2-statistics.json').read_text(encoding='utf-8'))
    units = gpd.read_file(LAYERS / 'territories-evidence.geojson')
    neighborhoods = units[units.unitType == 'neighborhood'].copy()
    annual = json.loads((INTERIM / 'land-cover-statistics.json').read_text(encoding='utf-8'))
    indicator_layer(neighborhoods, 'sanitationPrecariousPct', 'sanitation', [1, 5], ['#91b7b3','#e4bd59','#b76b52'])
    sectors = units[units.unitType=='census_sector'].copy()
    density_breaks = [2500,10000,20000,40000,80000]
    density_colors = ['#f0ebf6','#d4c3e5','#b493ce','#9164b3','#693d8d','#45225f']
    sectors['overlayColor'] = sectors.populationDensity.map(lambda value:density_colors[sum(value>=edge for edge in density_breaks)])
    save_layer('population',sectors[['id','name','populationTotal','areaKm2','populationDensity','overlayColor','geometry']])
    for year in YEARS:
        neighborhoods['vegetationPct'] = neighborhoods.id.map(lambda ident: annual[ident][str(year)]['vegetationPct'])
        indicator_layer(neighborhoods, 'vegetationPct', f'vegetation-{year}', [0.1, 1], ['#d2d8bb','#8aaf79','#3f8059'])
    indicator_layer(neighborhoods, 'urbanPct', 'urban-cover', [90, 98], ['#c0b9a9','#a58c73','#715d4e'])
    layers = [
        layer('flood-susceptibility','Suscetibilidade à inundação','Inundação','flood-susceptibility',[FLOOD_ID],'2015','Polígonos SGB, 1:20.000', [('Alta','#b63d35'),('Média','#e4bd59'),('Baixa','#5d8aa8'),('Fora dos polígonos: sem classe publicada','#7f8f8b')],LIMITATIONS[1]),
        layer('sanitation','Esgotamento precário declarado','Saneamento','sanitation',SANITATION_IDS,'2022','Percentual mínimo por bairro', [('Menos de 1%','#91b7b3'),('1% a menos de 5%','#e4bd59'),('5% ou mais','#b76b52')],LIMITATIONS[3]),
        layer('vegetation','Cobertura vegetal mapeada','Cobertura do solo','vegetation-2022',LAND_COVER_IDS,'2019–2023','MapBiomas 10 m, agregado por bairro', [('Menos de 0,1%','#d2d8bb'),('0,1% a menos de 1%','#8aaf79'),('1% ou mais','#3f8059')],LIMITATIONS[2],{str(year):f'layers/vegetation-{year}.geojson' for year in YEARS}),
        layer('urban-cover','Cobertura classificada como urbana','Cobertura do solo','urban-cover',[LAND_COVER_IDS[3]],'2022','MapBiomas 10 m, agregado por bairro', [('Menos de 90%','#c0b9a9'),('90% a menos de 98%','#a58c73'),('98% ou mais','#715d4e')],LIMITATIONS[2]),
        layer('population','Densidade por setor censitário','Demografia','population',[IBGE_ID],'2022','Habitantes por km², 809 setores', list(zip(['Menos de 2.500 hab/km²','2.500 a menos de 10 mil','10 a menos de 20 mil','20 a menos de 40 mil','40 a menos de 80 mil','80 mil hab/km² ou mais'],density_colors)),'Densidade calculada com área territorial total. Não mede renda ou vulnerabilidade social.'),
        layer('waterways','Hidrografia colaborativa OSM','Contexto territorial','waterways',[OSM_ID],'Extração em 03/10/2026','Traçados colaborativos OSM', [('Curso de água','#3b84a5')],'Cadastro incompleto; não mede vazão, capacidade ou manutenção de drenagem.'),
        layer('facilities','Equipamentos cadastrados','Contexto territorial','facilities',[OSM_ID],'Extração em 03/10/2026','Pontos representativos OSM', [('Escola, saúde ou centro comunitário','#4f8cc9')],'Localizações indicativas. A fonte não comprova propriedade pública ou viabilidade de intervenção.'),
        layer('green-spaces','Parques e jardins cadastrados','Contexto territorial','green-spaces',[OSM_ID],'Extração em 03/10/2026','Pontos representativos OSM', [('Parque, jardim ou área recreativa','#5f9d73')],'Localizações indicativas de cadastros colaborativos; não são polígonos de cobertura vegetal ou inventário completo.')
    ]
    satellite_limit = 'Mediana de NDVI de seis cenas Sentinel-2 de 05/08 a 01/10/2026. Nuvens e sombras filtradas; mínimo de três observações válidas. Pixels de 10 m misturam superfícies. Inclui gramíneas, arbustos e árvores; não mede fração de copas nem acurácia de campo. Não comparar diretamente com MapBiomas.'
    for ident,label,image_key,period,colors in [
        ('vegetation-recent','Sinal de vegetação recente','ndviImage',f"{satellite['startDate']} a {satellite['endDate']}", [('NDVI de 0,3 a menos de 0,4','#bddd80'),('NDVI de 0,4 a menos de 0,5','#65b257'),('NDVI de 0,5 ou mais','#177440'),('NDVI abaixo de 0,3, não destacado','transparent'),('Observações insuficientes','#7d8791')]),
        ('satellite-recent','Imagem Sentinel-2 datada','rgbImage',satellite['rgbDate'], [('Cores naturais, 10 m','#b8b8a5')])
    ]:
        image = satellite[image_key]
        layers.append(dict(id=ident,label=label,family='Vegetação recente',status='available',layerFile=image['file'],image=dict(role='reference' if image_key=='rgbImage' else 'evidence',**{k:image[k] for k in ['coordinates','width','height']}),
            temporalCoverage=period,resolution='Sentinel-2, 10 m',sourceDatasetIds=[SATELLITE_ID],legend=legend(colors),limitation=satellite_limit if ident=='vegetation-recent' else f"Cena em cores naturais de {satellite['rgbDate']}, escolhida pela maior cobertura local válida. A resolução é de 10 m; não identifica árvores individuais.",
            attribution='Copernicus Sentinel-2, 2026 / Element 84',defaultVisible=ident=='vegetation-recent'))
    layers.extend([
        layer('protected-areas','APAs e Parque Jardim Jurema','Patrimônio natural','protected-areas',[UC_ID],'Cadastro 2024 / ICMS 2025','6 polígonos oficiais e marcadores', [('APA','#2f9966'),('Parque natural municipal','#dfb845')], 'Cinco APAs e um parque no cadastro INEA. Marcadores são pontos internos dos polígonos, não entradas. Limites cadastrais precisam ser confrontados com o ato legal para decisões fundiárias.'),
        layer('rivers-official','Rios e canais oficiais','Hidrografia','rivers-official',[RIVER_ID,CANAL_ID],'BC25, edição 2018','1:25.000; entorno de 500 m', [('Curso de água','#3ab6ef'),('Canal','#36d6cf')], 'Traçados oficiais IBGE/SEA publicados pelo INEA, edição 2018. Inclui entorno de 500 m para preservar rios de divisa. Não mede vazão, navegabilidade ou condição atual de canais.'),
        layer('water-bodies','Massas de água cartografadas','Hidrografia','water-bodies',[WATER_ID],'BC25, edição 2018','1:25.000; entorno de 500 m', [('Massa de água','#217ab2')], 'Polígonos da edição 2018 da BC25. A lâmina de água pode ter mudado. Inclui entorno de 500 m.')
    ])
    for item in layers:
        if item['id'] in ['protected-areas','rivers-official','water-bodies']:
            item['attribution']='INEA / IBGE / SEA'
        if item['id'] in ['rivers-official','water-bodies']:
            item['coverageBufferMeters']=500
        if item['id'] in ['protected-areas','rivers-official']:
            item['defaultVisible']=True
    vegetation_layers,vegetation_research=publish_vegetation()
    layers.extend(vegetation_layers)
    field_layer,field_evidence=publish_field_evidence()
    layers.append(field_layer)
    vegetation_research['fieldEvidence']=field_evidence
    vegetation_research['referenceAudit']=json.loads((INTERIM/'independent-reference-audit/summary.json').read_text(encoding='utf-8'))
    territories, summaries = [], {}
    for row in units.itertuples():
        geometry = json.loads(gpd.GeoSeries([row.geometry],crs=4326).to_json())['features'][0]
        geometry['properties'] = dict(id=row.id,name=row.name,unitType=row.unitType)
        unit = dict(id=row.id,name=row.name,unitType=row.unitType,districtNames=row.districtNames,
                    neighborhoodName=None if pd.isna(row.neighborhoodName) else row.neighborhoodName,
                    sourceMode='processed',sourceDatasetId=IBGE_ID,areaKm2=row.areaKm2,populationTotal=int(row.populationTotal),geometry=geometry)
        territories.append(unit)
        signals = [dict(label='Densidade populacional · 2022',value=f'{row.populationDensity:,.0f}'.replace(',','.')+' hab/km²',evidenceLayerId='population',sourceMode='processed'),
                   dict(label='Área com classe média ou alta · SGB 2015',value=percent(row.floodMappedPct),evidenceLayerId='flood-susceptibility',sourceMode='processed'),
                   dict(label='Área sem classe de inundação publicada',value=percent(100-row.floodClassifiedPct),evidenceLayerId='flood-susceptibility',sourceMode='processed'),
                   dict(label='Cobertura classificada como urbana · 2022',value=percent(row.urbanPct),evidenceLayerId='urban-cover',sourceMode='processed')]
        if row.unitType == 'neighborhood':
            signals.extend([dict(label='Esgotamento precário declarado · 2022',value=percent(row.sanitationPrecariousPct)+' (mínimo observado)',evidenceLayerId='sanitation',sourceMode='processed'),
                            dict(label='Domicílios sem categoria de esgoto publicada',value=str(int(row.unclassifiedHouseholds)),evidenceLayerId='sanitation',sourceMode='processed')])
        solutions = []
        if row.floodMappedPct > 0:
            solutions.append(dict(label='Retenção e recuperação de margens',rationale='Há interseção com polígonos de suscetibilidade. Investigar corredores hídricos e espaços de retenção em campo, com estudo hidráulico e fundiário.',sourceMode='processed'))
        if row.urbanPct >= 90:
            solutions.append(dict(label='Jardins de chuva e biorretenção',rationale='O predomínio da classe urbana justifica investigar manejo distribuído das águas. Confirmar solo, espaço, contaminação, redes e manutenção antes de escolher locais.',sourceMode='processed'))
        if row.vegetationPct < 1:
            solutions.append(dict(label='Arborização e conexão de áreas verdes',rationale='A fonte mapeia poucas manchas vegetais. Fazer inventário de árvores e vistoria de calçadas antes de inferir déficit de arborização.',sourceMode='processed'))
        summaries[row.id] = dict(territoryId=row.id,status='available',signals=signals,solutionClasses=solutions,
                                 technicalLens=f'População do Censo 2022 agregada por código oficial. Área calculada em SIRGAS 2000 / UTM 23S. {percent(row.floodMappedPct)} da área intersecta classes média ou alta do SGB; {percent(100-row.floodClassifiedPct)} não tem classe nesta fonte. Sem pontuação composta. '+('Saneamento usa agregados oficiais por bairro, sem imputar as categorias ausentes.' if row.unitType=='neighborhood' else 'Saneamento foi promovido somente na escala dos bairros; não foi redistribuído nesta unidade.'),
                                 scienceCommunicationLens=f'Os indicadores ajudam a investigar onde soluções baseadas na natureza podem fazer sentido em {row.name}. A carta histórica de inundação, o Censo e a classificação do solo descrevem aspectos diferentes. Áreas sem informação não são áreas seguras. Nenhuma nota ou ordem de prioridade foi atribuída.')
    neighborhood_reference, neighborhood_layer = publish_neighborhoods(territories)
    layers.append(neighborhood_layer)
    municipality = next(unit for unit in territories if unit['unitType']=='municipality')
    bounds=units.total_bounds.tolist()
    bundle = dict(schemaVersion='meriti.app-data.v1',generatedAt=now(),outputCrs='EPSG:4326',sourceMode='processed',primaryTerritorialUnit='neighborhood',
                  studyArea=dict(code='3305109',name='São João de Meriti',shortName='Meriti',boundary=dict(type='FeatureCollection',features=[municipality['geometry']]),bounds=[[bounds[0],bounds[1]],[bounds[2],bounds[3]]]),
                  territorialUnits=territories,evidenceLayers=layers,opportunitySummaries=summaries,neighborhoodReference=neighborhood_reference,
                  methodology=dict(title='Indicadores territoriais, sem pontuação composta',description='Cruzamento espacial de fontes oficiais e contexto colaborativo. Valores originais e percentuais, sem normalização por ranking.',limitations=[*LIMITATIONS, NEIGHBORHOOD_LIMITATION]),
                  temporalEvidence=dict(hasTemporalEvidence=True,timelineReady=True,years=YEARS,defaultYear=2022,temporalCoverage='2019–2023',limitation='O ano selecionado altera somente a cobertura vegetal. SGB permanece em 2015 e Censo em 2022. Variações da classificação não comprovam mudanças reais sem validação independente.',observations=annual),
                  methodologyFiles=['docs/methodology/meriti.md','docs/methodology/meriti-neighborhoods-research.md'],protectedAreas=environmental['protectedAreas'],vegetationResearch=vegetation_research,
                  recentVegetation={key:satellite[key] for key in ['sourceId','startDate','endDate','sceneCount','resolutionMeters','minimumObservations','thresholds','rgbDate','sceneIds','observations']})
    with CATALOG.open(encoding='utf-8', newline='') as stream:
        catalog = {row['id']: row for row in csv.DictReader(stream)}
    source_ids = sorted({ident for layer in layers for ident in layer['sourceDatasetIds']})
    bundle['sourceReferences'] = [dict(id=ident, name=catalog[ident]['source_name'], institution=catalog[ident]['source_institution'],
                                      url=catalog[ident]['source_url'], period=catalog[ident]['temporal_coverage'], license=catalog[ident]['license']) for ident in source_ids]
    write_json(OUTPUT / 'phase3-app-data.json', bundle)
    neighborhoods=units[units.unitType=='neighborhood'].drop(columns='geometry')
    neighborhoods.to_csv(OUTPUT/'neighborhood-indicators.csv',index=False)
    update_catalog()
    write_json(OUTPUT/'metadata/output-manifest.json',dict(generatedAt=now(),files=[dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=digest_file(p)) for p in sorted(OUTPUT.rglob('*')) if p.is_file() and p.name!='output-manifest.json']))
    print(json.dumps(dict(territories=len(territories),layers=len(layers),years=YEARS,compositeScore=False)))


if __name__ == '__main__':
    build()
