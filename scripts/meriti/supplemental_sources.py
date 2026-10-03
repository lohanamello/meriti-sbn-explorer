from __future__ import annotations

import json
import math
import warnings
import argparse

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
import requests
from pyproj import Geod, Transformer
from rasterio.enums import ColorInterp, Resampling
from rasterio.features import geometry_mask
from rasterio.warp import calculate_default_transform, reproject, transform_bounds
from rasterio.windows import Window, from_bounds

from collect import ROOT, digest_file, now, write_json
from vegetation_palette import CANOPY_CLASSES, hex_rgb

SOURCE_ID = 'meta_wri__canopy_height_v2__2026'
RAW = ROOT / 'data/raw/meriti' / SOURCE_ID
INTERIM = ROOT / 'data/interim/meriti'
LAYERS = ROOT / 'data/processed/meriti/layers'
BASE_URL = 'https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/dinov3_global_chm_v2_ml3'
THRESHOLDS = [2, 3, 5]
MIN_COVERAGE_PCT = 95


def verify_cached_inputs(folder):
    provenance = folder / 'provenance.json'
    if provenance.exists():
        for entry in json.loads(provenance.read_text(encoding='utf-8'))['files']:
            if digest_file(ROOT / entry['file'].replace('\\', '/')) != entry['sha256']:
                raise ValueError(f"Cached source checksum mismatch: {entry['file']}")


def tile_quadkey(lon, lat, zoom=10):
    size = 2 ** zoom
    x = int((lon + 180) / 360 * size)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * size)
    return ''.join(str(((x >> bit) & 1) + 2 * ((y >> bit) & 1)) for bit in range(zoom - 1, -1, -1))


def exact_window(bounds, transform):
    window = from_bounds(*bounds, transform)
    left, top = math.floor(window.col_off), math.floor(window.row_off)
    right, bottom = math.ceil(window.col_off + window.width), math.ceil(window.row_off + window.height)
    return Window(left, top, right - left, bottom - top)


def download_metadata(tile):
    target = RAW / f'{tile}-imagery-dates.geojson'
    receipt = target.with_suffix('.receipt.json')
    url = f'{BASE_URL}/metadata/{tile}.geojson'
    if target.exists():
        assert digest_file(target) == json.loads(receipt.read_text(encoding='utf-8'))['sha256']
        return target
    response = requests.get(url, timeout=90)
    response.raise_for_status()
    target.write_bytes(response.content)
    write_json(receipt, dict(url=url, retrievedAt=now(), sha256=digest_file(target), sizeBytes=target.stat().st_size,
                            etag=response.headers.get('ETag'), lastModified=response.headers.get('Last-Modified')))
    return target


def collect_crop(boundary):
    bounds_wgs84 = boundary.to_crs(4326).total_bounds
    tiles = {tile_quadkey(lon, lat) for lon in bounds_wgs84[[0, 2]] for lat in bounds_wgs84[[1, 3]]}
    if len(tiles) != 1:
        raise ValueError(f'Expected one CHMv2 tile for Meriti, received {tiles}')
    tile = tiles.pop()
    target = RAW / 'canopy-height-native.tif'
    receipt = RAW / 'crop-provenance.json'
    url = f'{BASE_URL}/chm/{tile}.tif'
    if target.exists():
        assert digest_file(target) == json.loads(receipt.read_text(encoding='utf-8'))['sha256']
    else:
        bounds = boundary.to_crs(3857).buffer(100).total_bounds
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
                          GDAL_HTTP_TIMEOUT=90, GDAL_TIFF_INTERNAL_MASK=True):
            with rasterio.open(url) as source:
                window = exact_window(bounds, source.transform)
                values = source.read(1, window=window)
                valid_mask = source.dataset_mask(window=window)
                profile = source.profile.copy()
                profile.update(width=values.shape[1], height=values.shape[0], transform=source.window_transform(window))
                with rasterio.open(target, 'w', **profile) as output:
                    output.write(values, 1)
                    output.write_mask(valid_mask)
                write_json(receipt, dict(sourceId=SOURCE_ID, url=url, tile=tile, retrievedAt=now(), sha256=digest_file(target),
                                        operation='Native-grid rectangular crop, unchanged digital numbers and source dataset mask.',
                                        crs=str(source.crs), resolution=list(source.res), dtype=source.dtypes[0], units='meters',
                                        sourceNodata=source.nodata, sourceMaskFlags=[[str(flag) for flag in band] for band in source.mask_flag_enums],
                                        window=dict(colOffset=window.col_off, rowOffset=window.row_off, width=window.width, height=window.height),
                                        cropBounds=list(rasterio.transform.array_bounds(values.shape[0], values.shape[1], profile['transform']))))
    return target, download_metadata(tile)


def row_pixel_areas(transform, height):
    to_wgs84 = Transformer.from_crs(3857, 4326, always_xy=True)
    geod = Geod(ellps='WGS84')
    x0, x1 = transform.c, transform.c + transform.a
    areas = []
    for row in range(height):
        y0, y1 = transform.f + row * transform.e, transform.f + (row + 1) * transform.e
        lons, lats = to_wgs84.transform([x0, x1, x1, x0], [y0, y0, y1, y1])
        areas.append(abs(geod.polygon_area_perimeter(lons, lats)[0]))
    return np.asarray(areas)


def summarize(values, source_mask, inside, pixel_areas, land_cover):
    valid = inside & source_mask
    valid_area_m2 = float((valid.sum(axis=1) * pixel_areas).sum())
    total_area_m2 = float((inside.sum(axis=1) * pixel_areas).sum())
    coverage = valid_area_m2 / total_area_m2 * 100 if total_area_m2 else 0
    areas = {str(threshold): float(((valid & (values >= threshold)).sum(axis=1) * pixel_areas).sum())
             for threshold in THRESHOLDS}
    eligible = coverage >= MIN_COVERAGE_PCT
    common = valid & (land_cover > 0)
    model_canopy = common & (values >= 3)
    candidate_area = float((model_canopy.sum(axis=1) * pixel_areas).sum())
    cross = {}
    for label, selected in [('urban', land_cover == 24), ('vegetation', np.isin(land_cover, [3, 4, 5, 9, 11, 12, 32, 49, 50])),
                            ('other', (land_cover != 24) & ~np.isin(land_cover, [3, 4, 5, 9, 11, 12, 32, 49, 50]))]:
        cross_area = float(((model_canopy & selected).sum(axis=1) * pixel_areas).sum())
        cross[label] = dict(areaHa=round(cross_area / 10000, 6), shareOfModeledCanopyPct=round(cross_area / candidate_area * 100, 6) if candidate_area else None)
    return dict(totalPixels=int(inside.sum()), validPixels=int(valid.sum()), coveragePct=round(coverage, 6),
                validAreaHa=round(valid_area_m2 / 10000, 6), gridAreaHa=round(total_area_m2 / 10000, 6),
                modeledCanopyAreaHa={key: round(value / 10000, 6) if eligible else None for key, value in areas.items()},
                modeledCanopyPct={key: round(value / valid_area_m2 * 100, 6) if eligible else None for key, value in areas.items()},
                maximumHeightM=int(values[valid].max()) if valid.any() else None,
                mapBiomas2019Comparison=dict(commonValidAreaHa=round(float((common.sum(axis=1) * pixel_areas).sum()) / 10000, 6),
                                            modeledHeightAtLeast3mAreaHa=round(candidate_area / 10000, 6), byMapBiomasClass=cross))


def prepare():
    RAW.mkdir(parents=True, exist_ok=True)
    verify_cached_inputs(RAW)
    territories = gpd.read_file(LAYERS / 'territories.geojson').to_crs(3857)
    municipality = gpd.read_file(LAYERS / 'municipality.geojson').to_crs(3857)
    protected = gpd.read_file(LAYERS / 'protected-areas.geojson').to_crs(3857)
    protected = protected[protected.geom_type.isin(['Polygon', 'MultiPolygon'])]
    path, dates_path = collect_crop(municipality)
    dates = gpd.read_file(dates_path)
    dates = dates[dates.intersects(municipality.to_crs(dates.crs).geometry.iloc[0])].copy()
    dates.geometry = dates.geometry.intersection(municipality.to_crs(dates.crs).geometry.iloc[0])
    dates = dates[~dates.geometry.is_empty]
    dates['acq_date'] = dates['acq_date'].astype(str).str[:10]
    date_coverage_pct = dates.to_crs(31983).geometry.union_all().area / municipality.to_crs(31983).geometry.iloc[0].area * 100
    if date_coverage_pct < 99.999:
        raise ValueError('Incomplete acquisition-date coverage for Meriti')
    dates.to_file(INTERIM / 'chmv2-imagery-dates.geojson', driver='GeoJSON')
    print('Imagery dates:', dates.drop(columns='geometry').to_dict('records'), flush=True)
    with rasterio.open(path) as source:
        values = source.read(1)
        source_mask = source.dataset_mask() > 0
        shape = values.shape
        transform = source.transform
        areas = row_pixel_areas(transform, source.height)
        land_cover = np.zeros(shape, dtype=np.uint8)
        with rasterio.open(INTERIM / 'land-cover-2019.tif') as historical:
            reproject(rasterio.band(historical, 1), land_cover, src_transform=historical.transform, src_crs=historical.crs,
                      src_nodata=historical.nodata, dst_transform=transform, dst_crs=source.crs, dst_nodata=0, resampling=Resampling.nearest)
        observations = {}
        protected_observations = {}
        for _, unit in gpd.GeoDataFrame(pd.concat([territories, protected], ignore_index=True), crs=territories.crs).iterrows():
            window = exact_window(unit.geometry.bounds, transform).intersection(Window(0, 0, source.width, source.height))
            row_slice, col_slice = window.toslices()
            local_values = values[row_slice, col_slice]
            inside = geometry_mask([unit.geometry], out_shape=local_values.shape, transform=source.window_transform(window), invert=True)
            summary = summarize(local_values, source_mask[row_slice, col_slice], inside, areas[row_slice], land_cover[row_slice, col_slice])
            if str(unit.id).startswith('inea-uc-'):
                protected_observations[str(unit.id)] = dict(name=unit['name'], **summary)
            else:
                observations[str(unit.id)] = summary
        inside = geometry_mask(list(municipality.geometry), out_shape=shape, transform=transform, invert=True)
        rgba = np.zeros((4, *shape), dtype=np.uint8)
        for lower, upper, _, color in CANOPY_CLASSES:
            selected = inside & source_mask & (values >= lower) & (values < upper)
            rgba[:3, selected] = np.array(hex_rgb(color), dtype=np.uint8)[:, None]
            rgba[3, selected] = 230
        missing = inside & ~source_mask
        rgba[:3, missing] = np.array([128, 128, 128], dtype=np.uint8)[:, None]
        rgba[3, missing] = 150
        image_path = INTERIM / 'chmv2-canopy-height.png'
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', rasterio.errors.NotGeoreferencedWarning)
            with rasterio.open(image_path, 'w', driver='PNG', width=source.width, height=source.height, count=4, dtype='uint8') as output:
                output.write(rgba)
                output.colorinterp = (ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha)
            preview_width, preview_height = math.ceil(source.width / 2), math.ceil(source.height / 2)
            preview = np.zeros((4, preview_height, preview_width), dtype=np.uint8)
            preview_transform = transform * rasterio.Affine.scale(source.width / preview_width, source.height / preview_height)
            for band in range(4):
                reproject(rgba[band], preview[band], src_transform=transform, src_crs=source.crs,
                          dst_transform=preview_transform, dst_crs=source.crs, resampling=Resampling.nearest)
            preview_path = INTERIM / 'chmv2-canopy-height-preview.png'
            with rasterio.open(preview_path, 'w', driver='PNG', width=preview_width, height=preview_height, count=4, dtype='uint8') as output:
                output.write(preview)
                output.colorinterp = (ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha)
        west, south, east, north = transform_bounds(3857, 4326, *source.bounds)
        metadata = dict(sourceId=SOURCE_ID, generatedAt=now(), publicationYear=2026,
                        title='Altura modelada de copas, CHMv2 Meta/WRI', sourceUrl='https://registry.opendata.aws/dataforgood-fb-forestsv2/',
                        license='CC-BY-4.0', crs='EPSG:3857', nativePixelSizeMapMeters=list(source.res),
                        units='meter', thresholdsMeters=THRESHOLDS, minimumTerritoryCoveragePct=MIN_COVERAGE_PCT,
                        pixelAreaRangeM2=[float(areas.min()), float(areas.max())], areaMethod='WGS84 ellipsoidal area of each native pixel row, centers within IBGE 2022 territory, source validity mask retained.',
                        observations=observations, protectedAreaObservations=protected_observations,
                        imageryDateFields=dates.drop(columns='geometry').to_dict('records'), imageryDateCoveragePct=round(date_coverage_pct, 6),
                        imageryDates=sorted(dates['acq_date'].unique()), comparisonSourceId='mapbiomas__cobertura_uso_solo_10m_tif__2019',
                        comparisonMethod='MapBiomas 2019 collection 2 beta at 10m reprojected by nearest neighbor onto native CHMv2 grid. Common valid support. CHMv2 >=3m inside class24, vegetation classes or other. This is a representation comparison, not an accuracy assessment.',
                        nativeImage=dict(file=image_path.relative_to(ROOT).as_posix(), width=source.width, height=source.height),
                        image=dict(file=preview_path.relative_to(ROOT).as_posix(), width=preview_width, height=preview_height,
                                   resampling='Nearest neighbor for display only, approximately 2.4 map meters. Statistics use native grid.',
                                   coordinates=[[west, north], [east, north], [east, south], [west, south]]),
                        limitations=['Model estimates from historical optical imagery, not a local LiDAR or ground inventory.',
                                     'Publication year 2026 is not imagery year; read clipped date polygons.',
                                     'No independent nonvegetation mask applied: source model may confuse buildings, shadows, water or other objects with trees.',
                                     'Threshold sensitivity is not statistical confidence or local accuracy.',
                                     'Sub-threshold or zero height does not prove absence of low vegetation or ecological value.',
                                     'Do not subtract from 2026 NDVI to infer loss or growth: dates and estimands differ.'])
    write_json(INTERIM / 'chmv2-statistics.json', metadata)
    write_json(RAW / 'provenance.json', dict(sourceId=SOURCE_ID, retrievedAt=now(), sourceUrl=metadata['sourceUrl'], license=metadata['license'],
                                          crop=json.loads((RAW / 'crop-provenance.json').read_text(encoding='utf-8')),
                                          files=[dict(file=file.relative_to(ROOT).as_posix(), sizeBytes=file.stat().st_size, sha256=digest_file(file))
                                                 for file in sorted(RAW.iterdir()) if file.is_file() and file.name != 'provenance.json']))
    print(json.dumps(observations['3305109'], indent=2), flush=True)
    return metadata


def prepare_cbers():
    source_id = 'inpe__cbers4a_wpm_rgb__20260426'
    raw = ROOT / 'data/raw/meriti' / source_id
    raw.mkdir(parents=True, exist_ok=True)
    verify_cached_inputs(raw)
    api = 'https://data.inpe.br/bdc/stac/v1'
    collection_id = 'CB4A-WPM-PCA-FUSED-1'
    parameters = dict(collections=collection_id, bbox='-43.411,-22.815,-43.329,-22.755',
                      datetime='2025-01-01T00:00:00Z/2026-10-03T00:00:00Z', limit=100)
    for name, url, params in [('search', f'{api}/search', parameters), ('collection', f'{api}/collections/{collection_id}', None)]:
        target = raw / f'{name}.json'
        if not target.exists():
            response = requests.get(url, params=params, timeout=90)
            response.raise_for_status()
            write_json(target, response.json())
    search = json.loads((raw / 'search.json').read_text(encoding='utf-8'))
    if search['context']['matched'] != len(search['features']):
        raise ValueError('Incomplete CBERS search response')
    selected_id = 'CBERS4A_WPM_PCA_RGB321_20260426_199_142'
    selected = next(item for item in search['features'] if item['id'] == selected_id)
    write_json(raw / 'selected-item.json', selected)
    image_date = selected['properties']['datetime'][:10]
    url = selected['assets']['tci']['href']
    target = raw / 'rgb-native.tif'
    receipt_path = raw / 'crop-provenance.json'
    municipality = gpd.read_file(LAYERS / 'municipality.geojson')
    if target.exists():
        assert digest_file(target) == json.loads(receipt_path.read_text(encoding='utf-8'))['sha256']
    else:
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT=90):
            with rasterio.open(url) as source:
                bounds = municipality.to_crs(source.crs).buffer(100).total_bounds
                window = exact_window(bounds, source.transform)
                values = source.read(window=window)
                profile = source.profile.copy()
                profile.update(width=values.shape[2], height=values.shape[1], transform=source.window_transform(window))
                with rasterio.open(target, 'w', **profile) as output:
                    output.write(values)
                    output.colorinterp = (ColorInterp.red, ColorInterp.green, ColorInterp.blue)
                write_json(receipt_path, dict(sourceId=source_id, sourceUrl=url, itemId=selected_id, retrievedAt=now(),
                                             sha256=digest_file(target), sourceAsset=selected['assets']['tci'],
                                             operation='Native-grid rectangular crop. Original INPE PCA-fused RGB values unchanged.',
                                             crs=str(source.crs), resolution=list(source.res), nodata=source.nodata,
                                             cropBounds=list(rasterio.transform.array_bounds(values.shape[1], values.shape[2], profile['transform']))))
    with rasterio.open(target) as source:
        values = source.read()
        inside = geometry_mask(list(municipality.to_crs(source.crs).geometry), out_shape=values.shape[1:], transform=source.transform, invert=True)
        data_present = (values != 0).all(axis=0)
        rgba = np.zeros((4, *values.shape[1:]), dtype=np.uint8)
        rgba[:3] = values
        rgba[3, inside & data_present] = 255
        transform, width, height = calculate_default_transform(source.crs, 3857, source.width, source.height, *source.bounds, resolution=3)
        preview = np.zeros((4, height, width), dtype=np.uint8)
        for band in range(4):
            reproject(rgba[band], preview[band], src_transform=source.transform, src_crs=source.crs,
                      dst_transform=transform, dst_crs=3857, resampling=Resampling.nearest)
        png = INTERIM / 'cbers4a-rgb-20260426.png'
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', rasterio.errors.NotGeoreferencedWarning)
            with rasterio.open(png, 'w', driver='PNG', width=width, height=height, count=4, dtype='uint8') as output:
                output.write(preview)
                output.colorinterp = (ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha)
        west, south, east, north = transform_bounds(3857, 4326, *rasterio.transform.array_bounds(height, width, transform))
        metadata = dict(sourceId=source_id, generatedAt=now(), sourceUrl=f'{api}/collections/{collection_id}/items/{selected_id}',
                        date=image_date, resolutionMeters=2, crs=str(source.crs), license='CC-BY-4.0', itemId=selected_id,
                        title='CBERS-4A/WPM, RGB fusionado de 26 de abril de 2026',
                        dataPresencePct=round(float((inside & data_present).sum() / inside.sum() * 100), 6),
                        cloudFreePct=None, dataPresenceIsCloudFree=False, pixelValueRange=[int(values.min()), int(values.max())],
                        sceneSelection=dict(method='Latest 2026 candidate accepted by qualitative visual screening of local previews. No quantitative cloud assessment.',
                                            reviewed=[dict(date='2026-09-02', decision='rejected', reason='Clouds and cloud shadows visibly obscure extensive portions of Meriti.'),
                                                      dict(date='2026-04-26', decision='selected', reason='No conspicuous cloud obstruction in local preview; fine haze/shadow not quantitatively assessed.'),
                                                      dict(date='2026-03-31', decision='rejected', reason='Local overview preview contains no valid RGB data.'),
                                                      dict(date='2026-02-23', decision='rejected', reason='Clouds and cloud shadows visibly obscure extensive portions of Meriti.'),
                                                      dict(date='2026-01-28', decision='rejected', reason='Local overview preview contains no valid RGB data.')]),
                        image=dict(file=png.relative_to(ROOT).as_posix(), width=width, height=height,
                                   coordinates=[[west, north], [east, north], [east, south], [west, south]],
                                   resampling='Nearest neighbor to 3m EPSG3857 display grid. Native 2m RGB TIFF retained.'),
                        limitations=['RGB fusion via PCA, not surface reflectance and no NIR; cannot calculate valid NDVI from this product.',
                                     'No pixel cloud classification asset in selected STAC item; valid DN coverage is not cloud-free coverage.',
                                     'Visual interpretation requires separate protocol and uncertainty labels; image alone is not validated canopy coverage.',
                                     'This sensor is independent of Sentinel-2 imagery. Interpretation using CHM or NDVI as labels is not independent validation.'])
    write_json(INTERIM / 'cbers4a-statistics.json', metadata)
    write_json(raw / 'provenance.json', dict(sourceId=source_id, retrievedAt=now(), sourceUrl=metadata['sourceUrl'], license=metadata['license'],
                                          query=dict(url=f'{api}/search', parameters=parameters),
                                          files=[dict(file=file.relative_to(ROOT).as_posix(), sizeBytes=file.stat().st_size, sha256=digest_file(file))
                                                 for file in sorted(raw.iterdir()) if file.is_file() and file.name != 'provenance.json']))
    print(json.dumps(metadata, indent=2), flush=True)
    return metadata


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', choices=['chm', 'cbers', 'all'], default='all')
    arguments = parser.parse_args()
    if arguments.source in ('chm', 'all'):
        prepare()
    if arguments.source in ('cbers', 'all'):
        prepare_cbers()
