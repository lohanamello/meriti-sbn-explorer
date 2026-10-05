"""Join published IBGE income aggregates by code, without estimating suppressed data."""
from __future__ import annotations

import csv
import io
import json
import math
import zipfile
from collections import Counter

import requests

from collect import ROOT, CATALOG, digest_file, now, save_inventory, write_json

SOURCE_ID = 'ibge__renda_responsavel__2022'
BASE_URL = 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/'
RAW = ROOT / 'data/raw/meriti' / SOURCE_ID
OUTPUT = ROOT / 'data/processed/meriti'
SCOPES = {'municipality': ('municipios', 'CD_MUN'), 'district': ('distritos', 'CD_DIST'),
          'neighborhood': ('bairros', 'CD_BAIRRO'), 'census_sector': ('setores', 'CD_SETOR')}
BREAKS = [1000, 1500, 2000, 3000, 5000]
COLORS = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c']
MISSING_COLOR = '#888888'
LIMITATION = ('Rendimento nominal mensal das pessoas responsáveis com rendimento por domicílios particulares permanentes ocupados, Censo 2022; reais de 2022, sem correção pela inflação. '
              'Não é renda domiciliar per capita nem renda de todos os moradores. Responsáveis sem rendimento não integram a média e a mediana. '
              'X e setores sem registro permanecem sem dados. O mapa mantém os setores; o cartão usa o agregado oficial do território selecionado, sem calcular médias de medianas. '
              'As faixas de cor são apenas de visualização, não linhas de pobreza ou ranking de vulnerabilidade.')


def number(text):
    text = str(text).strip()
    if text.lower() in ('x', '-', '..', '...', '', 'nan'):
        return None
    result = float(text.replace(',', '.'))
    if not math.isfinite(result) or result < 0:
        raise ValueError(f'Invalid income value: {text}')
    return result


def color(value):
    return MISSING_COLOR if value is None else COLORS[sum(value >= threshold for threshold in BREAKS)]


def money(value):
    return 'Sem dados publicados' if value is None else 'R$ ' + f'{value:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')


def write_preserving_newlines(path, value):
    newline = '\r\n' if path.exists() and b'\r\n' in path.read_bytes() else '\n'
    text = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    path.write_bytes(text.replace('\n', newline).encode('utf-8'))


def acquire(filename, receipt_name=None):
    RAW.mkdir(parents=True, exist_ok=True)
    target = RAW / filename
    receipt = RAW / receipt_name if receipt_name else target.with_suffix('.receipt.json')
    if target.exists():
        if not receipt.exists() or digest_file(target) != json.loads(receipt.read_text())['sha256']:
            raise ValueError(f'Source provenance missing or changed: {target}')
    else:
        response = requests.get(BASE_URL + filename, timeout=120)
        response.raise_for_status()
        target.write_bytes(response.content)
        write_json(receipt, dict(url=BASE_URL + filename, retrievedAt=now(), sha256=digest_file(target)))
    return target


def source_rows():
    tables, provenance = {}, []
    dictionary = acquire('dicionario_de_dados_renda_responsavel_20260508.xlsx', 'dictionary-provenance.json')
    provenance.append(dict(file=dictionary.name, url=BASE_URL+dictionary.name, sha256=digest_file(dictionary)))
    for kind, (scope, code) in SCOPES.items():
        path = acquire(f'Agregados_por_{scope}_renda_responsavel_BR_20260508_csv.zip')
        with zipfile.ZipFile(path) as archive:
            files = [name for name in archive.namelist() if name.endswith('.csv')]
            if len(files) != 1:
                raise ValueError('Expected one CSV in source archive')
            raw = archive.read(files[0])
        encoding = 'utf-8-sig'
        try:
            content = raw.decode(encoding)
        except UnicodeDecodeError:
            encoding = 'latin-1'
            content = raw.decode(encoding)
        rows = [r for r in csv.DictReader(io.StringIO(content), delimiter=';') if r[code].startswith('3305109')]
        tables[kind] = {r[code]: r for r in rows}
        if len(tables[kind]) != len(rows):
            raise ValueError('Duplicate official code')
        provenance.append(dict(file=path.name, url=BASE_URL+path.name, sha256=digest_file(path), encoding=encoding, matchedRows=len(rows)))
    return tables, provenance


def register_source():
    with CATALOG.open(encoding='utf-8', newline='') as stream:
        rows = list(csv.DictReader(stream))
    fields = list(rows[0])
    row = dict.fromkeys(fields, '')
    row.update(id=SOURCE_ID, source_name='Censo 2022, rendimento médio e mediano do responsável pelo domicílio',
        source_institution='IBGE', source_url=BASE_URL, acquisition_route='direct_download', access_status='public',
        license='Downloads públicos do IBGE; atribuição ao IBGE.', spatial_coverage='São João de Meriti; originais nacionais',
        spatial_resolution='Setores, bairros, distritos e município oficiais', temporal_coverage='2022; revisão publicada em 08/05/2026',
        format='CSV em ZIP; dicionário XLSX; GeoJSON derivado', crs='Junção por código; geometria IBGE em EPSG:4326',
        evidence_family='Renda', potential_use='Contextualização socioeconômica para estudo de SbNs, sem ranking automático.',
        known_limitations=LIMITATION, raw_storage_path=RAW.relative_to(ROOT).as_posix(), collection_status='downloaded',
        promotion_status='promoted', collected_at=json.loads((RAW/'dictionary-provenance.json').read_text())['retrievedAt'],
        notes='V06004 (média) e V06006 (mediana). Agregados publicados em cada escala; X preservado como nulo.')
    save_inventory(fields, [r for r in rows if r['id'] != SOURCE_ID] + [row])


def enrich(bundle):
    tables, provenance = source_rows()
    register_source()
    observations = {}
    for unit in bundle['territorialUnits']:
        row = tables[unit['unitType']].get(unit['id'])
        observations[unit['id']] = dict(
            meanMonthlyBRL=number(row['V06004']) if row else None,
            medianMonthlyBRL=number(row['V06006']) if row else None,
            status='no_record' if row is None else 'suppressed' if row['V06004'].upper() == 'X' or row['V06006'].upper() == 'X' else 'published',
            sourceTerritoryType=unit['unitType'])
        summary = bundle['opportunitySummaries'][unit['id']]
        summary['signals'] = [s for s in summary['signals'] if s['evidenceLayerId'] not in ('income-mean', 'income-median')]
        for measure, field, title in [('median', 'medianMonthlyBRL', 'mediana'), ('mean', 'meanMonthlyBRL', 'média')]:
            summary['signals'].append(dict(label=f'Renda {title} dos responsáveis com renda · 2022',
                value=money(observations[unit['id']][field]), evidenceLayerId=f'income-{measure}', sourceMode='processed'))
    official = {unit['unitType']: {u['id'] for u in bundle['territorialUnits'] if u['unitType'] == unit['unitType']} for unit in bundle['territorialUnits']}
    for kind, rows in tables.items():
        if not set(rows).issubset(official[kind]):
            raise ValueError(f'Income source contains unmatched codes for {kind}')
    layers = []
    labels = ['Menos de R$ 1.000', 'R$ 1.000 a menos de 1.500', 'R$ 1.500 a menos de 2.000',
              'R$ 2.000 a menos de 3.000', 'R$ 3.000 a menos de 5.000', 'R$ 5.000 ou mais']
    for measure, field, title in [('median', 'medianMonthlyBRL', 'mediana'), ('mean', 'meanMonthlyBRL', 'média')]:
        ident = f'income-{measure}'
        features = [dict(type='Feature', geometry=u['geometry']['geometry'], properties=dict(id=u['id'], name=u['name'],
            **observations[u['id']], overlayColor=color(observations[u['id']][field])))
            for u in bundle['territorialUnits'] if u['unitType'] == 'census_sector']
        # Preserve the existing territorial geometries exactly; use compact JSON for map delivery.
        (OUTPUT/f'layers/{ident}.geojson').write_text(json.dumps(dict(type='FeatureCollection', features=features), ensure_ascii=False, allow_nan=False))
        layers.append(dict(id=ident, label=f'Renda {title} dos responsáveis', family='Renda', status='available',
            layerFile=f'layers/{ident}.geojson', temporalCoverage='Censo 2022 · revisão 08/05/2026',
            resolution='R$/mês · responsáveis com renda · setores', sourceDatasetIds=[SOURCE_ID],
            limitation=('Mediana: valor central da distribuição dos rendimentos. ' if measure == 'median' else 'Média: soma dos rendimentos dividida pelo número de responsáveis com rendimento; é sensível a valores altos. ') + LIMITATION,
            legend=[dict(label=label, color=shade) for label, shade in zip(labels, COLORS)]+[dict(label='Sem dados publicados', color=MISSING_COLOR)],
            rendering=dict(fillOpacity=.68), attribution='IBGE, Censo 2022; rendimento do responsável, revisão 08/05/2026'))
    bundle['evidenceLayers'] = [layer for layer in bundle['evidenceLayers'] if layer['id'] not in ('income-mean', 'income-median')] + layers
    sectors = [observations[u['id']] for u in bundle['territorialUnits'] if u['unitType'] == 'census_sector']
    bundle['income'] = dict(sourceId=SOURCE_ID, sourceUrl=BASE_URL, referenceYear=2022, releaseDate='2026-05-08',
        currency='BRL', inflationAdjusted=False, population='Responsáveis com rendimento em domicílios particulares permanentes ocupados',
        variables=dict(meanMonthlyBRL='V06004', medianMonthlyBRL='V06006'), observations=observations,
        sectorCoverage=dict(total=len(sectors), **dict(Counter(r['status'] for r in sectors))))
    if LIMITATION not in bundle['methodology']['limitations']:
        bundle['methodology']['limitations'].append(LIMITATION)
    reference = dict(id=SOURCE_ID, name='Rendimento do responsável pelo domicílio', institution='IBGE', url=BASE_URL,
        period='Censo 2022; revisão 08/05/2026', license='Downloads públicos do IBGE; atribuição ao IBGE.')
    bundle['sourceReferences'] = [r for r in bundle.get('sourceReferences', []) if r['id'] != SOURCE_ID] + [reference]
    write_json(OUTPUT/'metadata/income-report.json', dict(generatedAt=now(), limitation=LIMITATION, provenance=provenance,
        sectorCoverage=bundle['income']['sectorCoverage'], municipalIncome=observations['3305109'],
        definitions=dict(V06004='Rendimento nominal médio mensal de responsáveis com rendimento', V06006='Rendimento nominal mediano mensal de responsáveis com rendimento'),
        aggregation='Each scale uses its own official aggregate; no averaging of medians or spatial interpolation.'))
    return bundle


if __name__ == '__main__':
    path = OUTPUT/'phase3-app-data.json'
    bundle = enrich(json.loads(path.read_text()))
    bundle['generatedAt'] = now()
    write_preserving_newlines(path, bundle)
    write_preserving_newlines(OUTPUT/'metadata/output-manifest.json', dict(generatedAt=now(), files=[dict(path=p.relative_to(ROOT).as_posix(), bytes=p.stat().st_size, sha256=digest_file(p)) for p in sorted(OUTPUT.rglob('*')) if p.is_file() and p.name!='output-manifest.json']))
    print(json.dumps(bundle['income']['sectorCoverage']))
    print(json.dumps(bundle['income']['observations']['3305109']))
