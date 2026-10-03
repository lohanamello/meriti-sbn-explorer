from __future__ import annotations

import json
import math
import warnings
from datetime import datetime, timedelta

import geopandas as gpd
import numpy as np
import rasterio
import requests
from rasterio.enums import ColorInterp
from rasterio.features import geometry_mask
from rasterio.transform import from_origin
from rasterio.warp import Resampling, calculate_default_transform, reproject, transform_bounds
from rasterio.windows import Window, from_bounds

from collect import ROOT, digest_file, now, write_json
from curate import INTERIM, OUTPUT, LAYERS

SOURCE_ID = 'copernicus__sentinel2_meriti__2026'
RAW = ROOT / 'data/raw/meriti' / SOURCE_ID
MIN_OBSERVATIONS = 3
THRESHOLDS = [0.3, 0.4, 0.5]


def expanded_window(bounds, transform):
    window = from_bounds(*bounds, transform)
    left, top = math.floor(window.col_off), math.floor(window.row_off)
    right, bottom = math.ceil(window.col_off + window.width), math.ceil(window.row_off + window.height)
    return Window(left, top, right-left, bottom-top)


def crop_asset(item, band, bounds, raw_root=RAW):
    target = raw_root / item['id'] / f'{band}.tif'
    target.parent.mkdir(parents=True, exist_ok=True)
    asset = item['assets'][band]
    if not target.exists():
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT=60):
            with rasterio.open(asset['href']) as source:
                window = expanded_window(bounds, source.transform)
                values = source.read(window=window)
                profile = source.profile.copy()
                profile.update(width=values.shape[2], height=values.shape[1], transform=source.window_transform(window), compress='deflate')
                with rasterio.open(target, 'w', **profile) as output:
                    output.write(values)
        write_json(target.with_suffix('.json'), dict(sourceAsset=asset, cropBounds=bounds, downloadedAt=now(), sha256=digest_file(target),
                                                     operation='Native-grid rectangular window. Digital numbers unchanged.'))
    else:
        provenance = json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
        assert digest_file(target) == provenance['sha256']
    return target


def align_asset(path, shape, transform, crs, resampling=Resampling.nearest):
    with rasterio.open(path) as source:
        aligned = np.zeros((source.count, *shape), dtype=source.dtypes[0])
        for band in range(source.count):
            reproject(rasterio.band(source, band+1), aligned[band], src_transform=source.transform, src_crs=source.crs,
                      dst_transform=transform, dst_crs=crs, src_nodata=0, dst_nodata=0, resampling=resampling)
    return aligned


def dilate(mask, steps=2):
    for _ in range(steps):
        padded = np.pad(mask, 1, constant_values=True)
        mask = np.logical_or.reduce([padded[dy:dy+mask.shape[0], dx:dx+mask.shape[1]] for dy in range(3) for dx in range(3)])
    return mask


def write_raster(path, values, transform, crs, nodata):
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(path, 'w', driver='GTiff', height=values.shape[-2], width=values.shape[-1], count=1,
                       dtype=values.dtype, crs=crs, transform=transform, nodata=nodata, compress='deflate') as output:
        output.write(values, 1)


def map_image(name, rgba, transform, crs):
    height, width = rgba.shape[1:]
    bounds = rasterio.transform.array_bounds(height, width, transform)
    target_transform, target_width, target_height = calculate_default_transform(crs, 3857, width, height, *bounds)
    projected = np.zeros((4, target_height, target_width), dtype=np.uint8)
    for band in range(4):
        reproject(rgba[band], projected[band], src_transform=transform, src_crs=crs,
                  dst_transform=target_transform, dst_crs=3857, resampling=Resampling.nearest)
    path = OUTPUT / 'rasters' / f'{name}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', rasterio.errors.NotGeoreferencedWarning)
        with rasterio.open(path, 'w', driver='PNG', width=target_width, height=target_height, count=4, dtype='uint8') as output:
            output.write(projected)
            output.colorinterp = (ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha)
    west, south, east, north = transform_bounds(3857, 4326, *rasterio.transform.array_bounds(target_height, target_width, target_transform))
    return dict(file=f'rasters/{name}.png', coordinates=[[west,north],[east,north],[east,south],[west,south]],
                width=target_width, height=target_height, crs='EPSG:3857')


def prepare():
    RAW.mkdir(parents=True, exist_ok=True)
    search_path = ROOT / 'data/raw/meriti/sentinel2__scene_search__2026/search-c1.json'
    query = dict(collections=['sentinel-2-c1-l2a'],bbox=[-43.411,-22.815,-43.329,-22.755],datetime='2025-01-01T00:00:00Z/2026-10-03T00:00:00Z',limit=100,query={'eo:cloud_cover':{'lt':50}},sortby=[{'field':'properties.datetime','direction':'desc'}])
    if not search_path.exists():
        response = requests.post('https://earth-search.aws.element84.com/v1/search',json=query,timeout=60)
        response.raise_for_status()
        write_json(search_path,response.json())
    write_json(search_path.parent/'query-c1.json',query)
    items = json.loads(search_path.read_text(encoding='utf-8'))['features']
    items.sort(key=lambda item: item['properties']['datetime'], reverse=True)
    newest = datetime.fromisoformat(items[0]['properties']['datetime'].replace('Z','+00:00'))
    candidates = [item for item in items if datetime.fromisoformat(item['properties']['datetime'].replace('Z','+00:00')) >= newest-timedelta(days=90)]
    units = gpd.read_file(LAYERS/'territories.geojson').to_crs(32723)
    city = units[units.unitType=='municipality'].geometry.iloc[0]
    bounds = city.buffer(100).bounds
    left, top = math.floor(bounds[0]/10)*10, math.ceil(bounds[3]/10)*10
    shape = (math.ceil((top-bounds[1])/10), math.ceil((bounds[2]-left)/10))
    transform = from_origin(left, top, 10, 10)
    city_mask = geometry_mask([city], out_shape=shape, transform=transform, invert=True)
    ndvi_stack, accepted, examined = [], [], []
    best_rgb, best_quality, best_item = None, -1, None
    for item in candidates:
        write_json(RAW/item['id']/'item.json', item)
        scl = align_asset(crop_asset(item,'scl',bounds), shape, transform, 32723)[0]
        clear = ~dilate(~np.isin(scl, [4,5,6]))
        valid_pct = float(clear[city_mask].mean()*100)
        audit = dict(id=item['id'], date=item['properties']['datetime'], tileCloudPct=item['properties']['eo:cloud_cover'],
                     municipalClearPct=valid_pct, accepted=valid_pct>=90)
        examined.append(audit)
        print(item['id'], 'clear',round(valid_pct,2),flush=True)
        if valid_pct < 90:
            continue
        bands = {}
        for band in ['red','nir']:
            raw = align_asset(crop_asset(item,band,bounds), shape, transform, 32723)[0]
            scaling = item['assets'][band]['raster:bands'][0]
            reflectance = raw.astype(np.float32)*scaling['scale']+scaling.get('offset',0)
            clear &= (raw != 0) & (reflectance > 0) & (reflectance <= 1)
            bands[band] = reflectance
        ndvi = np.full(shape,np.nan,dtype='float32')
        np.divide(bands['nir']-bands['red'], bands['nir']+bands['red'], out=ndvi, where=clear)
        ndvi[~clear] = np.nan
        audit['validNdviPct'] = float(np.isfinite(ndvi[city_mask]).mean()*100)
        ndvi_stack.append(ndvi)
        accepted.append(item)
        if audit['validNdviPct'] > best_quality:
            best_quality, best_item = audit['validNdviPct'], item
        if len(accepted) == 6:
            break
    assert len(accepted) >= MIN_OBSERVATIONS, 'Not enough locally clear scenes'
    stack = np.stack(ndvi_stack)
    count = np.isfinite(stack).sum(axis=0).astype('uint8')
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', RuntimeWarning)
        median = np.nanmedian(stack, axis=0)
    reliable = (count>=MIN_OBSERVATIONS) & np.isfinite(median)
    assert reliable[city_mask].mean()>=0.95, 'Insufficient multi-scene coverage'
    composite = np.where(reliable & city_mask, median, -9999).astype('float32')
    write_raster(INTERIM/'sentinel2-ndvi-2026.tif',composite,transform,32723,-9999)
    write_raster(INTERIM/'sentinel2-observations-2026.tif',np.where(city_mask,count,0).astype('uint8'),transform,32723,0)
    observations = {}
    for unit in units.itertuples():
        included = geometry_mask([unit.geometry],out_shape=shape,transform=transform,invert=True)
        valid = included & reliable
        values = median[valid]
        eligible = valid.sum()/included.sum() >= 0.95
        observations[unit.id] = dict(validPixels=int(valid.sum()),totalPixels=int(included.sum()),
            coveragePct=round(float(valid.sum()/included.sum()*100),4),medianNdvi=round(float(np.median(values)),4) if values.size and eligible else None,
            vegetationSignalPct={str(threshold):round(float((values>=threshold).mean()*100),4) if values.size and eligible else None for threshold in THRESHOLDS},
            minimumObservations=int(count[valid].min()) if values.size else 0)
    rgba = np.zeros((4,*shape),dtype='uint8')
    for low, high, color in [(0.3,0.4,[189,221,128]),(0.4,0.5,[101,178,87]),(0.5,1.01,[23,116,64])]:
        selected = city_mask & reliable & (median>=low) & (median<high)
        rgba[:,selected] = np.array([*color,220],dtype='uint8')[:,None]
    rgba[:,city_mask & ~reliable] = np.array([125,135,145,200],dtype='uint8')[:,None]
    ndvi_image = map_image('sentinel2-ndvi-2026',rgba,transform,32723)
    best_rgb = align_asset(crop_asset(best_item,'visual',bounds),shape,transform,32723)
    rgb_alpha = np.where(city_mask & np.any(best_rgb>0,axis=0),255,0).astype('uint8')
    rgb_image = map_image('sentinel2-rgb-2026',np.concatenate([best_rgb,rgb_alpha[None]],axis=0),transform,32723)
    report = dict(sourceId=SOURCE_ID,generatedAt=now(),collection='sentinel-2-c1-l2a',resolutionMeters=10,
        startDate=min(item['properties']['datetime'][:10] for item in accepted),endDate=max(item['properties']['datetime'][:10] for item in accepted),
        sceneCount=len(accepted),minimumObservations=MIN_OBSERVATIONS,thresholds=THRESHOLDS,examinedScenes=examined,
        sceneIds=[item['id'] for item in accepted],rgbSceneId=best_item['id'],rgbDate=best_item['properties']['datetime'][:10],
        rgbMunicipalClearPct=best_quality,observations=observations,ndviImage=ndvi_image,rgbImage=rgb_image,
        minimumTerritoryCoveragePct=95,insufficientTerritoryIds=[ident for ident,value in observations.items() if value['coveragePct']<95],
        method='Median per-pixel NDVI after asset scale/offset, SCL 4/5/6 mask with 20 m dilation, at least 3 valid observations. No accuracy claim without independent reference.',
        limitation='Spectral signal includes grass, shrubs and trees; mixed 10 m pixels do not measure canopy fraction. Threshold sensitivity is not a confidence interval. Not directly comparable with MapBiomas classes.')
    write_json(INTERIM/'sentinel2-statistics.json',report)
    write_json(RAW/'provenance.json',dict(id=SOURCE_ID,source_url='https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a',
        downloaded_at=now(),searchQuery=query,collection='sentinel-2-c1-l2a',
        files=[dict(path=p.relative_to(ROOT).as_posix(),sha256=digest_file(p),bytes=p.stat().st_size) for p in sorted(RAW.rglob('*')) if p.is_file() and p.name!='provenance.json']))
    print(json.dumps({key:report[key] for key in ['startDate','endDate','sceneCount','rgbDate']},ensure_ascii=False),flush=True)
    print(json.dumps(observations['3305109']),flush=True)


if __name__=='__main__':
    prepare()
