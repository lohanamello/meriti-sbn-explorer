from __future__ import annotations

import csv
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[2]
SOURCE_ID = 'ibge__entorno_arborizacao__2022'
RAW = ROOT / 'data/raw/meriti' / SOURCE_ID
OUTPUT = ROOT / 'data/interim/meriti/field-evidence'
BASE = 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/'
PUBLICATION = 'https://biblioteca.ibge.gov.br/visualizacao/livros/liv102168.pdf'
LEVELS = {
    'municipality': ('Municipio', 'municipios'),
    'district': ('Distrito', 'distritos'),
    'neighborhood': ('Bairro', 'bairros'),
    'census_sector': ('Setor', 'setores'),
}
METRICS = {
    'residents': ('moradores', 5200),
    'households': ('domic%c3%adlios', 5000),
    'faces': ('faces', 5400),
}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def acquire(filename, url, manifest):
    path = RAW / filename
    known = next((item for item in manifest['files'] if item['file'] == filename), None)
    if known:
        if not path.exists() or sha256(path) != known['sha256'] or known['url'] != url:
            raise ValueError(f'Raw evidence checksum or URL mismatch: {filename}')
        return path
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    digest = hashlib.sha256(response.content).hexdigest()
    if path.exists():
        if sha256(path) != digest:
            raise ValueError(f'Upstream evidence changed; preserve and version the download: {filename}')
    else:
        path.write_bytes(response.content)
    if path.suffix == '.zip':
        with zipfile.ZipFile(path) as archive:
            if archive.testzip() is not None:
                raise ValueError(f'Invalid archive: {filename}')
    record = {
        'file': filename, 'url': url, 'sha256': digest, 'bytes': path.stat().st_size,
        'collectedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'lastModified': response.headers.get('Last-Modified'),
    }
    manifest['files'].append(record)
    write_json(RAW / 'provenance.json', manifest)
    return path


def count(value):
    if value in ('X', 'x', '-', '..', '...', ''):
        return None
    integer = int(value)
    if integer < 0:
        raise ValueError('Negative census count')
    return integer


def arborization_record(row, prefix):
    values = {f'V{number:05d}': count(row[f'V{number:05d}']) for number in [prefix, *range(prefix + 30, prefix + 35)]}
    total = values[f'V{prefix:05d}']
    categories = [values[f'V{prefix + offset:05d}'] for offset in range(30, 35)]
    none, one_two, three_four, five_plus, skipped = categories
    with_trees = None if any(value is None for value in categories[1:4]) else sum(categories[1:4])
    if total is not None and all(value is not None for value in categories):
        if sum(categories) != total:
            raise ValueError(f'Arborization categories do not sum to their official denominator: {row.iloc[0]}')
    return {
        'surveyedTotal': total, 'withoutTrees': none, 'oneOrTwoTrees': one_two,
        'threeOrFourTrees': three_four, 'fiveOrMoreTrees': five_plus, 'skipped': skipped,
        'withTrees': with_trees,
        'withTreesPct': 100 * with_trees / total if total and with_trees is not None else None,
        'answeredPct': 100 * (total - skipped) / total if total and skipped is not None else None,
        'variables': values,
    }


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = RAW / 'provenance.json'
    manifest = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {
        'sourceId': SOURCE_ID, 'sourceUrl': BASE, 'institution': 'IBGE',
        'referencePeriod': '2022-06-20/2023-05-28', 'publicationDate': '2025-04-17',
        'files': [],
    }
    acquire('dictionary.zip', BASE + 'dicionarios_de_dados_entorno.zip', manifest)
    acquire('publication.pdf', PUBLICATION, manifest)
    territory_path = ROOT / 'data/processed/meriti/layers/territories.geojson'
    territories = gpd.read_file(territory_path)
    records = {row.id: {'id': row.id, 'name': row['name'], 'unitType': row.unitType} for _, row in territories.iterrows()}
    audit = []
    for level, (folder, plural) in LEVELS.items():
        for metric, (suffix, prefix) in METRICS.items():
            filename = f'{plural}-{suffix}.zip'
            url = f'{BASE}Agregados_por_{folder}_csv/Agregados_por_{plural}_entorno_{suffix}_BR.zip'
            source = acquire(filename, url, manifest)
            with zipfile.ZipFile(source) as archive:
                names = [name for name in archive.namelist() if name.endswith('.csv')]
                if len(names) != 1:
                    raise ValueError(f'Expected exactly one CSV in {filename}')
                frame = pd.read_csv(archive.open(names[0]), sep=';', encoding='latin1', dtype=str, keep_default_na=False)
            key = frame.columns[0]
            frame = frame[frame[key].str.startswith('3305109')].copy()
            expected_ids = set(territories.loc[territories.unitType == level, 'id'])
            actual_ids = set(frame[key])
            if not frame[key].is_unique or not actual_ids <= expected_ids:
                raise ValueError(f'Duplicate or unmapped IBGE codes in {filename}')
            frame.to_csv(OUTPUT / f'{plural}-{metric}-meriti.csv', index=False, encoding='utf-8')
            for _, row in frame.iterrows():
                records[row[key]][metric] = arborization_record(row, prefix)
            audit.append({
                'level': level, 'metric': metric, 'sourceFile': filename,
                'publishedRecords': len(frame), 'territoryCount': len(expected_ids),
                'missingTerritoryIds': sorted(expected_ids - actual_ids),
                'suppressedTerritoryIds': sorted(frame.loc[frame[f'V{prefix:05d}'].str.upper() == 'X', key]),
            })
    for record in records.values():
        for metric in METRICS:
            record.setdefault(metric, None)
        faces = record['faces']
        record['observedTreePresence'] = None if faces is None or faces['withTrees'] is None else faces['withTrees'] > 0
    municipality = records['3305109']
    reconciliation = []
    for level in LEVELS:
        if level == 'municipality':
            continue
        for metric in METRICS:
            subset = [record[metric] for record in records.values() if record['unitType'] == level and record[metric] is not None]
            for variable, municipal_total in municipality[metric]['variables'].items():
                known = [record['variables'][variable] for record in subset if record['variables'][variable] is not None]
                known_sum = sum(known)
                if known_sum > municipal_total:
                    raise ValueError(f'Published subunits exceed the municipality for {level}/{metric}/{variable}')
                if len(known) == len(subset) and known_sum != municipal_total:
                    raise ValueError(f'Complete published subunits fail to reconcile: {level}/{metric}/{variable}')
                reconciliation.append({
                    'level': level, 'metric': metric, 'variable': variable,
                    'knownSum': known_sum, 'officialMunicipality': municipal_total,
                    'suppressedRecords': len(subset) - len(known),
                })
    layer = territories[territories.unitType == 'census_sector'].copy()
    layer['residentsWithTreesPct'] = layer.id.map(lambda ident: records[ident]['residents']['withTreesPct'] if records[ident]['residents'] else None)
    layer['facesWithTreesPct'] = layer.id.map(lambda ident: records[ident]['faces']['withTreesPct'] if records[ident]['faces'] else None)
    layer['facesWithTrees'] = layer.id.map(lambda ident: records[ident]['faces']['withTrees'] if records[ident]['faces'] else None)
    layer['observedTreePresence'] = layer.id.map(lambda ident: records[ident]['observedTreePresence'])
    layer['sourceId'] = SOURCE_ID
    layer['referencePeriod'] = '2022-06-20/2023-05-28'
    layer['limitation'] = 'Arborização observada em faces de vias. Não mede área de copas ou toda vegetação viva; ausência no quesito não demonstra ausência no setor.'
    layer['sourceUrl'] = BASE
    write_json(OUTPUT / 'ibge-arborizacao-setores.geojson', json.loads(layer.to_crs(4326).to_json(drop_id=True, na='null')))
    sector_records = [record for record in records.values() if record['unitType'] == 'census_sector']
    report = {
        'sourceId': SOURCE_ID, 'sourceUrl': BASE, 'publicationUrl': PUBLICATION,
        'referencePeriod': {'start': '2022-06-20', 'end': '2023-05-28'},
        'typicalCollectionPeriod': {'start': '2022-06-20', 'end': '2022-07-31'},
        'publicationDate': '2025-04-17', 'observations': records,
        'summary': {
            'municipality': municipality, 'totalCensusSectors': len(sector_records),
            'sectorsWithPublishedFaceObservations': sum(record['faces'] is not None for record in sector_records),
            'sectorsWithObservedTreePresence': sum(record['observedTreePresence'] is True for record in sector_records),
            'sectorsWithoutObservedTreePresence': sum(record['observedTreePresence'] is False for record in sector_records),
            'populationTotal': int(territories.loc[territories.id == '3305109', 'populationTotal'].iloc[0]),
        },
        'scope': 'Árvores na face e no canteiro central; porte acima de aproximadamente 1,70 m, independentemente de poda e quantidade de folhas. Não inclui toda vegetação viva.',
        'validationUse': 'Evidência independente de campo da presença histórica de árvores por setor. Não constitui referência geométrica por pixel ou validação da fração de área em 2026.',
        'denominator': 'Cada percentual divide as categorias com árvores pelo total oficial do respectivo universo selecionado para pesquisa, incluindo a categoria saltado no denominador.',
        'missingPolicy': 'X permanece nulo; registro ausente permanece sem observação; não inferir zeros por diferenças dos totais.',
        'audit': audit, 'reconciliation': reconciliation,
        'territoryGeometrySha256': sha256(territory_path),
        'files': manifest['files'],
    }
    write_json(OUTPUT / 'ibge-arborizacao-statistics.json', report)
    with (ROOT / 'data/catalog/meriti/dataset-inventory.csv').open(encoding='utf-8-sig', newline='') as stream:
        fields = next(csv.reader(stream))
    catalog_row = dict.fromkeys(fields, '')
    catalog_row.update(
        id=SOURCE_ID, source_name='Censo 2022, arborização observada no entorno dos domicílios', source_institution='IBGE',
        source_url=BASE, acquisition_route='direct_download', access_status='public',
        license='Downloads públicos do IBGE; atribuição ao IBGE. Os arquivos não declaram licença Creative Commons específica.',
        spatial_coverage='São João de Meriti; arquivos originais nacionais', spatial_resolution='Setores, bairros, distritos e município do IBGE',
        temporal_coverage='Coleta de 20/06/2022 a 28/05/2023; divulgação em 17/04/2025',
        format='CSV em ZIP; dicionários XLSX; metodologia PDF', crs='Estatísticas sem geometria; junção à malha IBGE por código',
        evidence_family='Arborização urbana observada em campo',
        potential_use='Corroborar presença histórica de árvores e mostrar moradores ou faces com arborização por território.',
        known_limitations='Não mede área de copas nem toda vegetação viva. Não valida pixels de 2026. X e setores sem registro permanecem nulos. Percentuais usam universos distintos.',
        raw_storage_path=f'data/raw/meriti/{SOURCE_ID}', collection_status='downloaded', promotion_status='not_reviewed',
        collected_at=max(item['collectedAt'] for item in manifest['files']),
        notes='806 de 809 setores com faces publicadas; 761 com ao menos uma face com árvores. Moradores/domicílios suprimidos em um setor. Ver metodologia e proveniência.',
    )
    write_json(OUTPUT / 'catalog-row.json', catalog_row)
    write_json(OUTPUT / 'layer-text.json', {
        'id': 'street-trees-census', 'label': 'Arborização nas vias · Censo 2022',
        'family': 'Investigação da vegetação', 'sourceDatasetIds': [SOURCE_ID],
        'temporalCoverage': 'Observações de campo de 2022–2023, divulgadas em 2025',
        'resolution': 'Setores censitários; dados próprios de bairros, distritos e município',
        'legendTitle': 'Moradores em faces com árvores (% do universo do entorno)',
        'legend': [
            {'label': '0 a menos de 25%', 'color': '#ecefc5'},
            {'label': '25 a menos de 50%', 'color': '#b8d19d'},
            {'label': '50 a menos de 75%', 'color': '#6aab75'},
            {'label': '75 a 100%', 'color': '#286447'},
            {'label': 'Sem dado publicado ou suprimido', 'color': '#c7cdd1'},
        ],
        'limitation': 'Percentual de moradores em faces de vias com árvores, não percentual de área vegetal. Coleta entre junho de 2022 e maio de 2023. O quesito considera árvores na face e no canteiro central, não toda vegetação viva. Setor sem registro positivo não significa setor sem vegetação. Três setores sem registro e um setor com moradores suprimidos permanecem sem valor.',
        'attribution': 'IBGE, Censo Demográfico 2022, Pesquisa Urbanística do Entorno dos Domicílios',
    })
    print(json.dumps(report['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
