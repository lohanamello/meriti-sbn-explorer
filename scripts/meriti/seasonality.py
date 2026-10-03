from __future__ import annotations

import json
import warnings

import geopandas as gpd
import numpy as np
import rasterio
import requests
from rasterio.features import geometry_mask

from collect import ROOT, digest_file, now, write_json
from curate import INTERIM, LAYERS, OUTPUT
from satellite import crop_asset, align_asset, dilate, map_image, write_raster

SOURCE_ID = 'copernicus__sentinel2_meriti_mensal__2025'
RAW = ROOT/'data/raw/meriti'/SOURCE_ID


def prepare():
    RAW.mkdir(parents=True, exist_ok=True)
    query = dict(collections=['sentinel-2-c1-l2a'],bbox=[-43.411,-22.815,-43.329,-22.755],
        datetime='2025-01-01T00:00:00Z/2025-12-31T23:59:59Z',limit=100,query={'eo:cloud_cover':{'lt':50}})
    search = RAW/'search.json'
    if not search.exists():
        response = requests.post('https://earth-search.aws.element84.com/v1/search',json=query,timeout=90)
        response.raise_for_status()
        write_json(search,response.json())
    payload = json.loads(search.read_text(encoding='utf-8'))
    items = payload['features']
    assert len({item['id'] for item in items}) == payload['numberMatched'], 'Incomplete STAC search; paginate before processing'
    units = gpd.read_file(LAYERS/'territories.geojson').to_crs(32723)
    city = units[units.unitType=='municipality'].geometry.iloc[0]
    with rasterio.open(INTERIM/'sentinel2-ndvi-2026.tif') as reference:
        shape, transform = reference.shape, reference.transform
    city_mask = geometry_mask([city],out_shape=shape,transform=transform,invert=True)
    bounds = city.buffer(100).bounds
    scenes, stack, audit = [], [], []
    for month in range(1,13):
        candidates = sorted([item for item in items if item['properties']['datetime'].startswith(f'2025-{month:02d}')],
            key=lambda item:(item['properties']['eo:cloud_cover'],item['properties']['datetime'],item['id']))
        best, best_clear, best_pct = None, None, -1
        for item in candidates:
            write_json(RAW/item['id']/'item.json',item)
            scl = align_asset(crop_asset(item,'scl',bounds,RAW),shape,transform,32723)[0]
            clear = ~dilate(~np.isin(scl,[4,5,6]))
            pct = float(clear[city_mask].mean()*100)
            audit.append(dict(id=item['id'],month=month,clearPct=pct))
            if pct>best_pct:
                best, best_clear, best_pct = item,clear,pct
            if pct>=98.5:
                break
        if best is None or best_pct<90:
            print(f'2025-{month:02d}: insufficient clear coverage ({best_pct:.2f}%)',flush=True)
            continue
        valid = best_clear.copy()
        bands = {}
        for band in ['red','nir']:
            raw = align_asset(crop_asset(best,band,bounds,RAW),shape,transform,32723)[0]
            scaling = best['assets'][band]['raster:bands'][0]
            value = raw.astype('float32')*scaling['scale']+scaling.get('offset',0)
            valid &= (raw!=0)&(value>0)&(value<=1)
            bands[band]=value
        ndvi = np.full(shape,np.nan,dtype='float32')
        np.divide(bands['nir']-bands['red'],bands['nir']+bands['red'],out=ndvi,where=valid)
        scenes.append(dict(id=best['id'],date=best['properties']['datetime'][:10],month=month,clearPct=best_pct,
            validPct=float(np.isfinite(ndvi[city_mask]).mean()*100),ndviAbove04Pct=float((ndvi[city_mask & valid]>=0.4).mean()*100)))
        stack.append(ndvi)
        print(f"{scenes[-1]['date']}: valid {scenes[-1]['validPct']:.2f}%",flush=True)
    assert len(scenes)>=6, 'At least six monthly observations are required'
    values=np.stack(stack)
    count=np.isfinite(values).sum(axis=0)
    quarters=np.stack([np.isfinite(values[[((s['month']-1)//3)==q for s in scenes]]).sum(axis=0) for q in range(4)])
    reliable=(count>=6)&np.all(quarters>=1,axis=0)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',RuntimeWarning)
        median=np.nanmedian(values,axis=0)
    occurrence=np.divide((values>=0.4).sum(axis=0),count,out=np.zeros(shape,dtype='float32'),where=count>0)
    classes=np.zeros(shape,dtype='uint8')
    classes[city_mask & ~reliable]=4
    classes[city_mask & reliable & (occurrence<0.2)]=1
    classes[city_mask & reliable & (occurrence>=0.2)&(occurrence<0.8)]=2
    classes[city_mask & reliable & (occurrence>=0.8)]=3
    write_raster(INTERIM/'sentinel2-monthly-ndvi-2025.tif',np.where(city_mask & reliable,median,-9999).astype('float32'),transform,32723,-9999)
    write_raster(INTERIM/'sentinel2-monthly-recurrence-2025.tif',classes,transform,32723,0)
    observations={}
    for unit in units.itertuples():
        included=geometry_mask([unit.geometry],out_shape=shape,transform=transform,invert=True)
        selected=included&reliable
        coverage=float(selected.sum()/included.sum()*100)
        eligible=coverage>=95 and selected.any()
        observations[unit.id]=dict(totalPixels=int(included.sum()),validPixels=int(selected.sum()),coveragePct=coverage,
            medianNdviAbove04Pct=float((median[selected]>=0.4).mean()*100) if eligible else None,
            recurrentSignalPct=float((occurrence[selected]>=0.8).mean()*100) if eligible else None,
            variableSignalPct=float(((occurrence[selected]>=0.2)&(occurrence[selected]<0.8)).mean()*100) if eligible else None)
    rgba=np.zeros((4,*shape),dtype='uint8')
    for label,color in [(2,[203,157,53,210]),(3,[24,107,69,230]),(4,[125,135,145,200])]:
        rgba[:,classes==label]=np.array(color,dtype='uint8')[:,None]
    image=map_image('sentinel2-recurrence-2025',rgba,transform,32723)
    report=dict(sourceId=SOURCE_ID,year=2025,sceneCount=len(scenes),scenes=scenes,examined=audit,query=query,
        minimumObservations=6,requiredQuarters=4,minimumTerritoryCoveragePct=95,threshold=0.4,
        occurrenceThresholds=[0.2,0.8],observations=observations,image=image,
        selectionRule='For each month, inspect lowest tile-cloud candidates first; choose clearest examined locally, stop search at 98.5% local clear coverage. Reject months below 90%.',
        limitation='Frequency of spectral signal among selected dates, not vegetation fraction, tree canopy, probability or validated accuracy. One clear acquisition per available month; seasonal grass may vary.')
    write_json(INTERIM/'sentinel2-seasonality-2025.json',report)
    write_json(RAW/'provenance.json',dict(id=SOURCE_ID,source_url='https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a',downloaded_at=now(),searchQuery=query,
        files=[dict(path=p.relative_to(ROOT).as_posix(),sha256=digest_file(p),bytes=p.stat().st_size) for p in sorted(RAW.rglob('*')) if p.is_file() and p.name!='provenance.json']))
    print(json.dumps(observations['3305109']),flush=True)


if __name__=='__main__':
    prepare()
