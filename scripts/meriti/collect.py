from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data/catalog/meriti/dataset-inventory.csv'
RAW = ROOT / 'data/raw/meriti'
LOCAL_IDS = [
    'ibge__setores_censitarios_agregados_rj__2022',
    'ibge__setores_censitarios_malha_rj__2022',
    'academic__cem_setores_rm_rio_zip__2022',
    'ana__snirh_estacoes_hidrometeorologicas_rj__atual',
    *[f'mapbiomas__cobertura_uso_solo_10m_tif__{year}' for year in range(2019, 2024)],
]
SOURCES = [
    ('ibge__bairros_domicilios1__2022', 'Censo 2022, domicílios por bairro, parte 1', 'IBGE', 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Bairro_csv/Agregados_por_bairros_caracteristicas_domicilio1_BR.zip', 'domicilios1.zip', 'Demografia', '2022', 'Bairros do IBGE', 'Downloads públicos do IBGE', 'Denominador de domicílios particulares permanentes ocupados, V00001.'),
    ('ibge__bairros_domicilios2__2022', 'Censo 2022, saneamento por bairro', 'IBGE', 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Bairro_csv/Agregados_por_bairros_caracteristicas_domicilio2_BR_20250417.zip', 'domicilios2.zip', 'Saneamento', '2022; revisão de abril de 2025', 'Bairros do IBGE', 'Downloads públicos do IBGE', 'Agregados oficiais por bairro evitam somar células suprimidas dos setores; X permanece ausente.'),
    ('ibge__dicionario__2022', 'Dicionário dos agregados do Censo 2022', 'IBGE', 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx', 'dictionary.xlsx', 'Documentação', '2022; dicionário revisado em 2026', 'Setores censitários', 'Downloads públicos do IBGE', 'Verificar definição e denominador de cada variável.'),
    ('ibge__domicilios2__2022', 'Censo 2022, características dos domicílios 2', 'IBGE', 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_caracteristicas_domicilio2_BR_20250417.zip', 'domicilios2.zip', 'Saneamento e condições domiciliares', '2022; revisão de abril de 2025', 'Setores censitários', 'Downloads públicos do IBGE', 'Supressões estatísticas devem permanecer ausentes; selecionar exclusivamente setores do município.'),
    ('sinisa__esgoto__2023', 'SINISA 2024, esgotamento sanitário, referência 2023', 'Ministério das Cidades', 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/SINISA_ESGOTO_Planilhas_2023_v2.zip', 'esgoto.zip', 'Saneamento', '2023', 'Municipal e prestador', 'Informação pública federal', 'Valores municipais não devem ser distribuídos artificialmente entre bairros.'),
    ('osm__meriti_bbox__snapshot', 'Equipamentos e hidrografia no entorno de Meriti', 'OpenStreetMap contributors', 'https://overpass-api.de/api/interpreter', 'osm.json', 'Equipamentos e espaços verdes', 'Data da extração', 'Feições colaborativas', 'Open Database License (ODbL)', 'Consulta por envelope deve ser recortada pelo limite municipal; cobertura incompleta e propriedade não verificada.'),
    ('sgb__meriti_sig__2015', 'Suscetibilidade a inundação e movimentos de massa de Meriti', 'SGB/CPRM', 'https://rigeo.sgb.gov.br/bitstreams/c609802b-ba56-4438-8e0f-ed0416136bcf/download', 'susceptibility.zip', 'Inundação', '2015', '1:20.000', 'Item de acesso aberto no RIGeo', 'Suscetibilidade histórica; não mede probabilidade, profundidade ou eventos atuais.'),
    ('sgb__meriti_base__2015', 'Base cartográfica de Meriti', 'SGB/CPRM', 'https://rigeo.sgb.gov.br/bitstreams/4b1edd77-f8a0-4c8e-9c56-841342e1e014/download', 'base.zip', 'Hidrografia', '2015', 'Base da carta 1:20.000', 'Item de acesso aberto no RIGeo', 'Rede cartográfica histórica; não comprova capacidade de drenagem.'),
    ('sgb__meriti_mapa__2015', 'Carta de suscetibilidade de Meriti', 'SGB/CPRM', 'https://rigeo.sgb.gov.br/bitstreams/4b6e06f2-9eef-4a3a-903c-d62c1860730a/download', 'mapa.pdf', 'Documentação', '2015', '1:20.000', 'Item de acesso aberto no RIGeo', 'Documento cartográfico de referência.'),
    ('municipio__pmsb__2014', 'Plano Municipal de Saneamento Básico', 'Prefeitura de São João de Meriti', 'https://meriti.rj.gov.br/dom/arquivos/2014/maio/19-3951.pdf', 'pmsb.pdf', 'Saneamento e drenagem', '2014', 'Municipal', 'Publicação oficial municipal', 'Diagnóstico histórico em PDF; não representa a situação atual de cada bairro.'),
    ('sinisa__planilhas__2024', 'SINISA, planilhas de informações e indicadores', 'Ministério das Cidades', 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/planilhas-de-informacoes-e-indicadores', 'portal.html', 'Saneamento e drenagem', 'Conforme módulo e ano de referência', 'Municipal e prestador', 'Informação pública federal; verificar termos de cada produto', 'Portal não é uma tabela de indicadores. Não distribuir valores municipais entre bairros.'),
    ('inea__geoservicos__atual', 'INEA, informações geoespaciais', 'INEA', 'https://www.inea.rj.gov.br/biodiversidade-territorio/conheca-o-territorio/informacoes-geoespaciais/', 'portal.html', 'Vegetação e recursos hídricos', 'Conforme camada', 'Estadual; resolução por camada', 'Verificar licença por camada', 'Requer seleção e validação das camadas que efetivamente cobrem Meriti.'),
    ('cemaden__pluviometros__atual', 'Cemaden, rede de pluviômetros automáticos', 'Cemaden/MCTI', 'https://www2.cemaden.gov.br/pluviometros-automatico/', 'portal.html', 'Chuva e monitoramento', 'Conforme estação e período', 'Pontual', 'Informação pública; verificar termos do produto', 'Exige disponibilidade temporal, controle de falhas e representatividade espacial; não usar como chuva por bairro.'),
    ('ana__hidroweb__atual', 'ANA, séries hidrológicas HidroWeb', 'ANA', 'https://www.snirh.gov.br/hidroweb/', 'portal.html', 'Chuva e recursos hídricos', 'Conforme estação e período', 'Pontual', 'Informação pública federal', 'Séries e estações precisam de seleção e crítica antes de comparação.'),
    ('osm__meriti__snapshot', 'Equipamentos, espaços verdes e hidrografia de Meriti', 'OpenStreetMap contributors', 'https://overpass-api.de/api/interpreter', 'osm.json', 'Equipamentos e espaços verdes', 'Data da extração', 'Feições colaborativas', 'Open Database License (ODbL)', 'Cobertura incompleta; não comprova propriedade pública nem viabilidade de intervenção.'),
]
OSM_QUERY = '[out:json][timeout:60];area["ref:IBGE"="3305109"]->.a;(nwr["amenity"~"^(school|hospital|clinic|health_post|community_centre)$"](area.a);nwr["leisure"~"^(park|garden|playground)$"](area.a);way["waterway"](area.a););out geom;'
OSM_BBOX_QUERY = '[out:json][timeout:60][bbox:-22.815,-43.411,-22.755,-43.329];(nwr["amenity"~"^(school|hospital|clinic|health_post|community_centre)$"];nwr["leisure"~"^(park|garden|playground)$"];way["waterway"];);out geom;'


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def digest_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def seed_inventory():
    with (ROOT / 'data/catalog/dataset-inventory.csv').open(encoding='utf-8-sig', newline='') as stream:
        original = list(csv.DictReader(stream))
    fields = list(original[0])
    rows = []
    for source in original:
        if source['id'] not in LOCAL_IDS:
            continue
        row = dict(source)
        row.update(promotion_status='not_reviewed', notes='Arquivo preservado da coleta do Rio; avaliar recorte de São João de Meriti.', potential_use='Referência territorial, ambiental ou demográfica de São João de Meriti.')
        rows.append(row)
    for ident, name, institution, url, filename, family, period, resolution, license_text, limitations in SOURCES:
        row = dict.fromkeys(fields, '')
        row.update(id=ident, source_name=name, source_institution=institution, source_url=url,
                   acquisition_route='overpass_query' if ident.startswith('osm') else 'direct_download',
                   access_status='public', license=license_text, spatial_coverage='São João de Meriti ou cobertura nacional/estadual',
                   spatial_resolution=resolution, temporal_coverage=period, format=Path(filename).suffix.lstrip('.'),
                   evidence_family=family, potential_use='Avaliar oportunidades territoriais de SBN em São João de Meriti.',
                   known_limitations=limitations, raw_storage_path=f'data/raw/meriti/{ident}', collection_status='discovered', promotion_status='not_reviewed')
        rows.append(row)
    return fields, rows


def save_inventory(fields, rows):
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    with CATALOG.open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def acquire(row, filename):
    directory = ROOT / row['raw_storage_path']
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / filename
    provenance_path = directory / 'provenance.json'
    if target.exists() and provenance_path.exists():
        provenance = json.loads(provenance_path.read_text(encoding='utf-8'))
        if digest_file(target) != provenance['sha256']:
            raise ValueError(f'Checksum mismatch: {target}')
        row.update(collection_status='downloaded', collected_at=provenance['downloaded_at'])
        return
    if target.exists():
        raise FileExistsError(f'Raw file without provenance, preserve for review: {target}')
    session = requests.Session()
    session.headers['User-Agent'] = 'Meriti-NBS-Research/1.0 (public data collection)'
    if row['id'].startswith('osm'):
        query = OSM_BBOX_QUERY if 'bbox' in row['id'] else OSM_QUERY
        response = session.post(row['source_url'], data={'data': query}, stream=True, timeout=(20, 100))
    else:
        response = session.get(row['source_url'], stream=True, timeout=(20, 100))
    response.raise_for_status()
    partial = target.with_suffix(target.suffix + '.part')
    digest = hashlib.sha256()
    with partial.open('wb') as stream:
        for chunk in response.iter_content(1024 * 1024):
            stream.write(chunk)
            digest.update(chunk)
    partial.rename(target)
    completed = now()
    provenance = dict(id=row['id'], source_url=row['source_url'], resolved_url=response.url,
                      downloaded_at=completed, stored_path=target.relative_to(ROOT).as_posix(),
                      bytes_written=target.stat().st_size, sha256=digest.hexdigest(), content_type=response.headers.get('Content-Type'))
    if row['id'].startswith('osm'):
        provenance['query'] = query
    write_json(provenance_path, provenance)
    row.update(collection_status='downloaded', collected_at=completed)


def merge_inventory(seeds, previous):
    seed_ids = {row['id'] for row in seeds}
    return [previous.get(row['id'], row) for row in seeds] + [
        row for ident, row in previous.items() if ident not in seed_ids
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='*')
    args = parser.parse_args()
    fields, seeds = seed_inventory()
    if CATALOG.exists():
        with CATALOG.open(encoding='utf-8', newline='') as stream:
            previous = {row['id']: row for row in csv.DictReader(stream)}
        rows = merge_inventory(seeds, previous)
    else:
        rows = seeds
    filenames = {source[0]: source[4] for source in SOURCES}
    save_inventory(fields, rows)
    for row in rows:
        if row['id'] not in filenames or (args.only and row['id'] not in args.only):
            continue
        try:
            acquire(row, filenames[row['id']])
            print(row['id'], row['collection_status'], flush=True)
        except (requests.RequestException, OSError, ValueError) as error:
            row.update(collection_status='blocked', notes=f'{now()}: {type(error).__name__}: {error}')
            print(row['id'], row['notes'], flush=True)
        save_inventory(fields, rows)


if __name__ == '__main__':
    main()
