from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.features import geometry_mask
from rasterio.mask import mask
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from shapely import make_valid
from shapely.geometry import LineString, Point, Polygon, mapping

from collect import ROOT, CATALOG, digest_file, now, write_json

INTERIM = ROOT / 'data/interim/meriti'
OUTPUT = ROOT / 'data/processed/meriti'
LAYERS = OUTPUT / 'layers'
IBGE_ID = 'ibge__setores_censitarios_agregados_rj__2022'
FLOOD_ID = 'sgb__meriti_sig__2015'
VEGETATION_CLASSES = [3, 4, 5, 9, 11, 12, 32, 49, 50]
YEARS = list(range(2019, 2024))
SEWAGE_COLUMNS = [f'V{i:05}' for i in range(309, 317)]
PRECARIOUS_COLUMNS = [f'V{i:05}' for i in range(312, 317)]


def raw_file(ident, suffix):
    matches = [p for p in (ROOT / 'data/raw').glob(f'**/{ident}/*{suffix}') if p.name != 'provenance.json']
    if len(matches) != 1:
        raise ValueError(f'Expected one raw file for {ident}: {matches}')
    return matches[0]


def geojson(frame):
    return json.loads(frame.to_crs(4326).to_json(drop_id=True, na='null'))


def save_layer(name, frame):
    payload = geojson(frame)
    write_json(LAYERS / f'{name}.geojson', payload)
    return payload


def census_units():
    source = raw_file(IBGE_ID, '.gpkg')
    provenance = json.loads(source.with_name('provenance.json').read_text(encoding='utf-8'))
    if digest_file(source) != provenance['sha256']:
        raise ValueError('IBGE raw checksum mismatch')
    sectors = gpd.read_file(source, where="CD_MUN='3305109'").to_crs(31983)
    assert len(sectors) == 809 and sectors.CD_SETOR.is_unique
    assert sectors.geometry.is_valid.all() and not sectors.v0001.isna().any()
    assert int(sectors.v0001.sum()) == 440962
    records = []
    for code, label, kind in [('CD_MUN', 'NM_MUN', 'municipality'), ('CD_DIST', 'NM_DIST', 'district'), ('CD_BAIRRO', 'NM_BAIRRO', 'neighborhood'), ('CD_SETOR', 'CD_SETOR', 'census_sector')]:
        for ident, group in sectors.groupby(code, sort=True):
            geometry = group.geometry.union_all()
            assert geometry.is_valid and not geometry.is_empty
            records.append(dict(id=str(ident), name=('Setor ' if kind == 'census_sector' else '') + str(group.iloc[0][label]),
                                unitType=kind, districtNames=' / '.join(sorted(group.NM_DIST.unique())),
                                neighborhoodName=str(group.iloc[0].NM_BAIRRO) if kind == 'census_sector' else None,
                                populationTotal=int(group.v0001.sum()), areaKm2=float(geometry.area / 1e6), geometry=geometry))
    units = gpd.GeoDataFrame(records, crs=31983)
    units['populationDensity'] = units.populationTotal / units.areaKm2
    save_layer('territories', units)
    save_layer('municipality', units[units.unitType == 'municipality'])
    return sectors, units


def flood_evidence(units):
    source = raw_file(FLOOD_ID, '.zip')
    flood = gpd.read_file(f'zip://{source}!Suscetibilidade/Inundacao_A.shp').to_crs(31983)
    invalid = int((~flood.is_valid).sum())
    flood.geometry = flood.geometry.map(make_valid)
    city = units[units.unitType == 'municipality'].geometry.iloc[0]
    flood = gpd.clip(flood, city, keep_geom_type=True)
    flood = flood[~flood.is_empty].copy()
    colors = {'Alta': '#b63d35', 'Média': '#e4bd59', 'Baixa': '#5d8aa8'}
    assert set(flood.CLASSE).issubset(colors)
    flood['overlayColor'] = flood.CLASSE.map(colors)
    flood['referenceYear'] = 2015
    save_layer('flood-susceptibility', flood[['CLASSE', 'referenceYear', 'overlayColor', 'geometry']])
    classified = flood.geometry.union_all()
    marked = flood[flood.CLASSE.isin(['Alta', 'Média'])].geometry.union_all()
    units['floodMappedPct'] = units.geometry.intersection(marked).area / units.geometry.area * 100
    units['floodClassifiedPct'] = units.geometry.intersection(classified).area / units.geometry.area * 100
    return dict(sourceFeatures=284, clippedFeatures=len(flood), repairedGeometries=invalid,
                classifiedMunicipalAreaPct=float(classified.area / city.area * 100),
                method='Interseção exata em EPSG:31983; união por classe impede contagem dupla.',
                limitation='Fora dos polígonos publicados significa sem classe nesta fonte, não ausência de risco. Carta de 2015, escala 1:20.000.')


def read_neighborhood_table(ident):
    frame = pd.read_csv(raw_file(ident, '.zip'), sep=';', dtype=str, encoding='latin1')
    frame = frame[frame.CD_BAIRRO.str.startswith('3305109')].set_index('CD_BAIRRO')
    assert len(frame) == 16 and frame.index.is_unique
    return frame


def sanitation_evidence(units):
    totals = read_neighborhood_table('ibge__bairros_domicilios1__2022')
    detailed = read_neighborhood_table('ibge__bairros_domicilios2__2022')
    numeric = detailed[SEWAGE_COLUMNS].apply(pd.to_numeric, errors='coerce')
    denominator = pd.to_numeric(totals.V00001, errors='raise')
    assert numeric.notna().all().all()
    assert (numeric >= 0).all().all()
    observed = numeric.sum(axis=1)
    assert (observed <= denominator).all()
    evidence = pd.DataFrame(dict(households=denominator, reportedHouseholds=observed,
                                 unclassifiedHouseholds=denominator - observed,
                                 precariousHouseholds=numeric[PRECARIOUS_COLUMNS].sum(axis=1)))
    evidence['sanitationCoveragePct'] = evidence.reportedHouseholds / evidence.households * 100
    evidence['sanitationPrecariousPct'] = evidence.precariousHouseholds / evidence.households * 100
    assert (evidence.sanitationCoveragePct >= 95).all()
    evidence.index.name = 'id'
    evidence.to_csv(INTERIM / 'sanitation-neighborhoods.csv')
    for key in evidence:
        units[key] = units.id.map(evidence[key])
    return dict(minimumReportedCoveragePct=float(evidence.sanitationCoveragePct.min()),
                households=int(denominator.sum()), unclassifiedHouseholds=int((denominator - observed).sum()),
                numerator=PRECARIOUS_COLUMNS, denominator='V00001',
                limitation='Percentual mínimo observado. Restante não classificado não é saneamento adequado. Rede geral ou pluvial não comprova tratamento de esgoto.')


def land_cover(units):
    city = units[units.unitType == 'municipality'].geometry.iloc[0]
    bounds = city.bounds
    left, top = math.floor(bounds[0] / 10) * 10, math.ceil(bounds[3] / 10) * 10
    width = math.ceil((bounds[2] - left) / 10)
    height = math.ceil((top - bounds[1]) / 10)
    transform = from_origin(left, top, 10, 10)
    unit_masks = {row.id: geometry_mask([row.geometry], out_shape=(height, width), transform=transform, invert=True) for row in units.itertuples()}
    city_wgs = gpd.GeoSeries([city], crs=31983).to_crs(4326).iloc[0]
    annual = {row.id: {} for row in units.itertuples()}
    reports = []
    for year in YEARS:
        source = raw_file(f'mapbiomas__cobertura_uso_solo_10m_tif__{year}', '.tif')
        target = INTERIM / f'land-cover-{year}.tif'
        if target.exists():
            with rasterio.open(target) as dataset:
                assert dataset.transform == transform and dataset.crs.to_epsg() == 31983
                values = dataset.read(1)
        else:
            with rasterio.open(source) as dataset:
                cropped, original_transform = mask(dataset, [city_wgs.buffer(0.001)], crop=True)
                values = np.zeros((height, width), dtype=np.uint8)
                reproject(cropped[0], values, src_transform=original_transform, src_crs=dataset.crs,
                          dst_transform=transform, dst_crs='EPSG:31983', resampling=Resampling.nearest, src_nodata=0, dst_nodata=0)
            with rasterio.open(target, 'w', driver='GTiff', height=height, width=width, count=1, dtype='uint8', crs='EPSG:31983', transform=transform, nodata=0, compress='deflate') as dataset:
                dataset.write(values, 1)
        for ident, included in unit_masks.items():
            pixels = values[included]
            valid = pixels[pixels > 0]
            annual[ident][str(year)] = dict(vegetationPct=round(float(np.isin(valid, VEGETATION_CLASSES).sum() / len(valid) * 100), 4) if len(valid) else None,
                                           urbanPct=round(float((valid == 24).sum() / len(valid) * 100), 4) if len(valid) else None,
                                           validPixels=int(len(valid)), totalPixels=int(len(pixels)),
                                           coveragePct=round(len(valid) / len(pixels) * 100, 4) if len(pixels) else 0)
        reports.append(dict(year=year, source=str(source.relative_to(ROOT)), crop=str(target.relative_to(ROOT)), sha256=digest_file(target),
                            classes=np.unique(values).tolist(), **annual['3305109'][str(year)]))
        print('MapBiomas',year,annual['3305109'][str(year)],flush=True)
    units['vegetationPct'] = units.id.map(lambda ident: annual[ident]['2022']['vegetationPct'])
    units['urbanPct'] = units.id.map(lambda ident: annual[ident]['2022']['urbanPct'])
    write_json(INTERIM / 'land-cover-statistics.json', annual)
    return annual, reports


def osm_evidence(units):
    source = raw_file('osm__meriti_bbox__snapshot', '.json')
    payload = json.loads(source.read_text(encoding='utf-8'))
    if payload.get('remark') or not payload.get('elements'):
        raise ValueError('OSM response incomplete or empty')
    city = units[units.unitType == 'municipality'].to_crs(4326).geometry.iloc[0]
    features = []
    skipped_relations = 0
    for element in payload['elements']:
        tags = element.get('tags', {})
        if element['type'] == 'node':
            geometry = Point(element['lon'], element['lat'])
        elif element['type'] == 'way' and len(element.get('geometry', [])) >= 2:
            coords = [(p['lon'], p['lat']) for p in element['geometry']]
            geometry = Polygon(coords) if len(coords) >= 4 and coords[0] == coords[-1] and 'waterway' not in tags else LineString(coords)
        else:
            skipped_relations += 1
            continue
        geometry = make_valid(geometry).intersection(city)
        if geometry.is_empty:
            continue
        kind = 'waterway' if 'waterway' in tags else 'green-space' if 'leisure' in tags else 'facility'
        if kind != 'waterway' and geometry.geom_type not in ('Point', 'MultiPoint'):
            geometry = geometry.representative_point()
        features.append(dict(osmId=f"{element['type']}/{element['id']}", name=tags.get('name', 'Sem nome cadastrado'),
                             kind=kind, category=tags.get('waterway', tags.get('leisure', tags.get('amenity'))),
                             overlayColor={'waterway':'#3b84a5','green-space':'#5f9d73','facility':'#4f8cc9'}[kind], geometry=geometry))
    frame = gpd.GeoDataFrame(features, crs=4326)
    for kind, layer in [('waterway','waterways'), ('green-space','green-spaces'), ('facility','facilities')]:
        save_layer(layer, frame[frame.kind == kind])
    return dict(received=len(payload['elements']), clipped=len(frame), skippedRelations=skipped_relations,
                counts=frame.kind.value_counts().to_dict(), limitation='Pontos de equipamentos e áreas verdes representam registros colaborativos. Não são inventário completo nem comprovação de acesso público.')


def prepare():
    INTERIM.mkdir(parents=True, exist_ok=True)
    LAYERS.mkdir(parents=True, exist_ok=True)
    _, units = census_units()
    flood = flood_evidence(units)
    sanitation = sanitation_evidence(units)
    annual, raster_report = land_cover(units)
    osm = osm_evidence(units)
    save_layer('territories-evidence', units)
    write_json(OUTPUT / 'metadata/data-quality-report.json', dict(generatedAt=now(), municipalityCode='3305109',
               population=440962, unitCounts=units.unitType.value_counts().to_dict(), flood=flood, sanitation=sanitation,
               landCover=raster_report, osm=osm))
    return units, annual


if __name__ == '__main__':
    prepare()
