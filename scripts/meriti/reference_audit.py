from __future__ import annotations

import argparse
import json

import geopandas as gpd
import numpy as np
import rasterio
import requests
from PIL import Image, ImageDraw
from rasterio.features import geometry_mask
from rasterio.enums import Resampling
from rasterio.warp import reproject
from shapely.geometry import shape

from collect import ROOT, digest_file, now, write_json
from supplemental_sources import exact_window

RAW = ROOT / 'data/raw/meriti/independent_reference_audit_20261003'
OUT = ROOT / 'data/interim/meriti/independent-reference-audit'
CELLS = ROOT / 'data/processed/meriti/validation/sample-cells-blinded.geojson'
INPE = 'https://data.inpe.br/bdc/stac/v1'
ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
BOUNDS = '-43.411,-22.815,-43.329,-22.755'


def fetched_json(name, url, params):
    target = RAW / f'{name}.json'
    receipt = RAW / f'{name}.receipt.json'
    if target.exists():
        assert digest_file(target) == json.loads(receipt.read_text())['sha256']
    else:
        response = requests.get(url, params=params, timeout=120)
        response.raise_for_status()
        write_json(target, response.json())
        write_json(receipt, dict(url=response.url, retrievedAt=now(), sha256=digest_file(target)))
    return json.loads(target.read_text(encoding='utf-8'))


def catalogs():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    cells = gpd.read_file(CELLS)
    for collection in ['CB4A-WPM-PCA-FUSED-1', 'CB4A-WPM-L4-DN-1', 'CB4A-WPM-L2-DN-1']:
        result = fetched_json(collection, f'{INPE}/search', dict(collections=collection, bbox=BOUNDS,
            datetime='2026-01-01T00:00:00Z/2026-10-03T23:59:59Z', limit=100))
        expected = result.get('context', {}).get('matched', result.get('numberMatched'))
        if expected != len(result['features']):
            raise ValueError(f'Incomplete catalog {collection}: {expected} vs {len(result["features"])}')
        for feature in result['features']:
            rows.append(dict(collection=collection, id=feature['id'], date=feature['properties']['datetime'],
                             assets=list(feature['assets']), cloudCover=feature['properties'].get('eo:cloud_cover'),
                             blindedCellsIntersectingFootprint=int(cells.intersects(shape(feature['geometry'])).sum())))
    write_json(OUT / 'catalog-inventory.json', dict(generatedAt=now(), items=rows))
    for layer in [9, 10]:
        fetched_json(f'esri-metadata-{layer}', f'{ESRI}/{layer}/query',
                     dict(f='geojson', where='1=1', geometry=BOUNDS, geometryType='esriGeometryEnvelope',
                          inSR=4326, outSR=4326, spatialRel='esriSpatialRelIntersects', outFields='*', returnGeometry='true'))
    fetched_json('cbers-l4-collection', f'{INPE}/collections/CB4A-WPM-L4-DN-1', None)
    fetched_json('esri-world-imagery-item', 'https://www.arcgis.com/sharing/rest/content/items/10df2279f9684e4a9f6a7f08febac2a9', {'f': 'json'})
    print(json.dumps(rows, indent=2), flush=True)


def collect_native(item_id):
    catalog = json.loads((RAW / 'CB4A-WPM-PCA-FUSED-1.json').read_text(encoding='utf-8'))
    item = next(feature for feature in catalog['features'] if feature['id'] == item_id)
    if item_id == 'CBERS4A_WPM_PCA_RGB321_20260426_199_142':
        previous = ROOT / 'data/raw/meriti/inpe__cbers4a_wpm_rgb__20260426'
        target = previous / 'rgb-native.tif'
        receipt = json.loads((previous / 'crop-provenance.json').read_text())
        assert digest_file(target) == receipt['sha256']
        return target
    target = RAW / f'{item_id}.tif'
    receipt = target.with_suffix('.receipt.json')
    if target.exists():
        assert digest_file(target) == json.loads(receipt.read_text())['sha256']
        return target
    municipality = gpd.read_file(ROOT / 'data/processed/meriti/layers/municipality.geojson')
    url = item['assets']['tci']['href']
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT=120):
        with rasterio.open(url) as source:
            bounds = municipality.to_crs(source.crs).buffer(100).total_bounds
            window = exact_window(bounds, source.transform)
            values = source.read(window=window, boundless=True)
            profile = source.profile.copy()
            profile.update(width=values.shape[2], height=values.shape[1], transform=source.window_transform(window))
            with rasterio.open(target, 'w', **profile) as output:
                output.write(values)
            write_json(receipt, dict(itemId=item_id, date=item['properties']['datetime'], url=url, retrievedAt=now(),
                operation='Native values cropped by HTTP range. No cloud screening or enhancement.', sha256=digest_file(target),
                resolution=list(source.res), crs=str(source.crs), bounds=list(bounds), bytes=target.stat().st_size))
    return target


def l4_bands(item_id):
    catalog = json.loads((RAW / 'CB4A-WPM-L4-DN-1.json').read_text(encoding='utf-8'))
    item = next(feature for feature in catalog['features'] if feature['id'] == item_id)
    municipality = gpd.read_file(ROOT / 'data/processed/meriti/layers/municipality.geojson')
    if not shape(item['geometry']).intersects(municipality.geometry.iloc[0]):
        raise ValueError('Footprint does not intersect municipality')
    for band in ['BAND0', 'BAND1', 'BAND2', 'BAND3', 'BAND4']:
        target = RAW / f'{item_id}-{band}.tif'
        receipt = target.with_suffix('.receipt.json')
        if target.exists():
            assert digest_file(target) == json.loads(receipt.read_text())['sha256']
            continue
        url = item['assets'][band]['href']
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT=120):
            with rasterio.open(url) as source:
                bounds = municipality.to_crs(source.crs).buffer(100).total_bounds
                window = exact_window(bounds, source.transform)
                values = source.read(window=window, boundless=True)
                profile = source.profile.copy()
                profile.update(width=values.shape[2], height=values.shape[1], transform=source.window_transform(window),
                               tiled=True, blockxsize=256, blockysize=256)
                with rasterio.open(target, 'w', **profile) as output:
                    output.write(values)
                write_json(receipt, dict(itemId=item_id, band=band, acquisitionDate=item['properties']['datetime'],
                    url=url, retrievedAt=now(), operation='Native DN crop by HTTP range, no reflectance conversion.',
                    sha256=digest_file(target), resolution=list(source.res), dtype=source.dtypes[0],
                    crs=str(source.crs), bounds=list(bounds), bytes=target.stat().st_size))
        print(json.dumps(dict(item=item_id, band=band, acquired=True)), flush=True)
    l4_pilot(item_id)
    l4_chips(item_id)


def l4_pilot(item_id):
    cells = gpd.read_file(CELLS).to_crs(32723)
    selected = np.random.default_rng(20261003).choice(len(cells), 16, replace=False)
    folder = OUT / item_id
    folder.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (4 * 540, 4 * 290), 'white')
    draw = ImageDraw.Draw(sheet)
    scales = {}
    for band in range(5):
        with rasterio.open(RAW / f'{item_id}-BAND{band}.tif') as source:
            values = source.read(1)
            valid = values[values > 0]
            scales[band] = np.percentile(valid, [2, 98]).tolist()
    rows = []
    for index, selected_index in enumerate(selected):
        cell = cells.iloc[int(selected_index)]
        center = cell.geometry.representative_point()
        bounds = (center.x - 40, center.y - 40, center.x + 40, center.y + 40)
        panels = []
        for name, bands in [('PAN 2m', [0, 0, 0]), ('RGB 8m', [3, 2, 1]), ('NIR-R-G 8m', [4, 3, 2])]:
            channels = []
            for band in bands:
                with rasterio.open(RAW / f'{item_id}-BAND{band}.tif') as source:
                    window = exact_window(bounds, source.transform)
                    values = source.read(1, window=window, boundless=True)
                    transform = source.window_transform(window)
                low, high = scales[band]
                channels.append(np.clip((values.astype(float) - low) / max(high - low, 1) * 255, 0, 255).astype(np.uint8))
            panel = Image.fromarray(np.stack(channels, axis=-1)).resize((180, 180), Image.Resampling.NEAREST)
            painter = ImageDraw.Draw(panel)
            vertices = [~transform * pair for pair in cell.geometry.exterior.coords]
            painter.line([(x / values.shape[1] * 180, y / values.shape[0] * 180) for x, y in vertices], fill='#ff3be8', width=1)
            panels.append((name, panel))
        x, y = index % 4 * 540, index // 4 * 290
        draw.text((x + 5, y + 5), cell.sample_id, fill='black')
        for j, (name, panel) in enumerate(panels):
            draw.text((x + j * 180 + 5, y + 25), name, fill='black')
            sheet.paste(panel, (x + j * 180, y + 45))
        rows.append(dict(sampleId=cell.sample_id))
    sheet.save(folder / 'blind-pilot-sheet.png')
    write_json(folder / 'pilot-selection.json', dict(seed=20261003, samples=rows, inputCellsSha256=digest_file(CELLS),
        viewContextMeters=80, displayScales=scales, display='Native DN, per-band whole-crop 2nd/98th percentile stretch; no pansharpening; nearest-neighbor zoom only.',
        limitation='Display transformation only. DN is not surface reflectance; no NDVI or area estimate produced.'))


def l4_chips(item_id):
    cells = gpd.read_file(CELLS).to_crs(32723)
    folder = OUT / item_id
    folder.mkdir(parents=True, exist_ok=True)
    sources = {band: rasterio.open(RAW / f'{item_id}-BAND{band}.tif') for band in range(5)}
    scales = json.loads((folder / 'pilot-selection.json').read_text())['displayScales']
    records = []
    compact_date = item_id.split('_')[3]
    acquisition_date = f'{compact_date[:4]}-{compact_date[4:6]}-{compact_date[6:8]}'
    try:
        for cell in cells.itertuples():
            center = cell.geometry.representative_point()
            bounds = (center.x - 40, center.y - 40, center.x + 40, center.y + 40)
            image = Image.new('RGB', (768, 286), 'white')
            draw = ImageDraw.Draw(image)
            draw.text((8, 8), f'{cell.sample_id} | {acquisition_date} | 80m context | cell boundary in magenta', fill='black')
            presence = {}
            for panel_index, (name, bands) in enumerate([('PAN 2m', [0, 0, 0]), ('RGB 8m', [3, 2, 1]), ('NIR-R-G 8m', [4, 3, 2])]):
                channels = []
                for band in bands:
                    source = sources[band]
                    window = exact_window(bounds, source.transform)
                    values = source.read(1, window=window, boundless=True)
                    transform = source.window_transform(window)
                    inside = geometry_mask([cell.geometry], values.shape, transform, invert=True)
                    presence[f'BAND{band}'] = float(((values > 0) & inside).sum() / inside.sum()) if inside.any() else None
                    low, high = scales[str(band)]
                    channels.append(np.clip((values.astype(float) - low) / max(high - low, 1) * 255, 0, 255).astype(np.uint8))
                panel = Image.fromarray(np.stack(channels, axis=-1)).resize((256, 256), Image.Resampling.NEAREST)
                painter = ImageDraw.Draw(panel)
                vertices = [~transform * pair for pair in cell.geometry.exterior.coords]
                painter.line([(x / values.shape[1] * 256, y / values.shape[0] * 256) for x, y in vertices], fill='#ff3be8', width=1)
                image.paste(panel, (panel_index * 256, 30))
                draw.text((panel_index * 256 + 8, 20), name, fill='black')
            png = folder / f'{cell.sample_id}.png'
            image.save(png)
            records.append(dict(sampleId=cell.sample_id, date=acquisition_date, dataPresenceByBand=presence,
                                cloudFreeFraction=None, image=png.relative_to(ROOT).as_posix(), sha256=digest_file(png)))
    finally:
        for source in sources.values():
            source.close()
    write_json(folder / 'chips.json', dict(generatedAt=now(), inputCellsSha256=digest_file(CELLS), chips=records,
        sourceIds=[dict(band=band, sha256=digest_file(RAW / f'{item_id}-BAND{band}.tif')) for band in range(5)],
        limitations=['PAN has 2m pixels, color and NIR have 8m pixels. Pixel dimensions do not certify reference fraction precision.',
                     'Display uses per-band 2nd/98th percentiles and nearest-neighbor zoom. Raw DN is preserved.',
                     'No cloud model, photointerpretation label or validated fraction is generated by this function.']))
    print(json.dumps(dict(item=item_id, chips=len(records))), flush=True)


def relative_alignment():
    item_id = 'CBERS_4A_WPM_20260702_198_142_L4'
    july_path = RAW / f'{item_id}-BAND0.tif'
    april_path = ROOT / 'data/raw/meriti/inpe__cbers4a_wpm_rgb__20260426/rgb-native.tif'
    cells = gpd.read_file(CELLS).to_crs(32723)
    selected = np.random.default_rng(20261003).choice(len(cells), 16, replace=False)
    rows = []
    with rasterio.open(july_path) as july, rasterio.open(april_path) as april:
        for selected_index in selected:
            cell = cells.iloc[int(selected_index)]
            center = cell.geometry.representative_point()
            window = exact_window((center.x - 80, center.y - 80, center.x + 80, center.y + 80), july.transform)
            july_values = july.read(1, window=window, boundless=True).astype(float)
            transform = july.window_transform(window)
            april_values = np.zeros(july_values.shape, dtype=float)
            reproject(rasterio.band(april, 2), april_values, src_transform=april.transform, src_crs=april.crs,
                      dst_transform=transform, dst_crs=july.crs, resampling=Resampling.bilinear)
            july_gradient = np.hypot(*np.gradient(july_values))
            april_gradient = np.hypot(*np.gradient(april_values))
            scores = []
            margin = 10
            target = july_gradient[margin:-margin, margin:-margin]
            for dy in range(-5, 6):
                for dx in range(-5, 6):
                    comparison = april_gradient[margin + dy:april_values.shape[0] - margin + dy,
                                                margin + dx:april_values.shape[1] - margin + dx]
                    value = np.corrcoef(target.ravel(), comparison.ravel())[0, 1]
                    scores.append((float(value), dx, dy))
            best = max(scores)
            rows.append(dict(sampleId=cell.sample_id, pearsonGradientCorrelation=best[0],
                             aprilRelativeToJulyEastM=best[1] * 2, aprilRelativeToJulyNorthM=-best[2] * 2,
                             searchBoundaryHit=abs(best[1]) == 5 or abs(best[2]) == 5,
                             translationMagnitudeM=float(np.hypot(best[1], best[2]) * 2)))
    write_json(OUT / 'relative-alignment-pilot.json', dict(generatedAt=now(), targetDate='2026-07-02', comparedDate='2026-04-26',
        method='Independent local translation diagnostic on image-gradient Pearson correlation, 160m context, central ~120m compared; 2m search increments within +/-10m; no transformation fitted or applied.',
        referenceFiles=[dict(file=path.relative_to(ROOT).as_posix(), sha256=digest_file(path)) for path in [july_path, april_path]],
        limitations=['This measures image-patch relative agreement, not absolute geolocation accuracy or independent control-point RMSE.',
                     'Changing shadows, off-nadir building displacement, radiometry and vegetation can bias the correlation optimum.',
                     'No positional adequacy approval follows from this diagnostic. No measured Esri alignment is available.'], observations=rows))
    print(json.dumps(rows), flush=True)


def chips(item_id):
    source_path = collect_native(item_id)
    cells = gpd.read_file(CELLS)
    folder = OUT / item_id
    folder.mkdir(parents=True, exist_ok=True)
    rows = []
    with rasterio.open(source_path) as source:
        cells = cells.to_crs(source.crs)
        for cell in cells.itertuples():
            geometry = cell.geometry
            center = geometry.representative_point()
            bounds = (center.x - 30, center.y - 30, center.x + 30, center.y + 30)
            window = exact_window(bounds, source.transform)
            values = source.read(window=window, boundless=True)
            transform = source.window_transform(window)
            inside = geometry_mask([geometry], values.shape[1:], transform, invert=True, all_touched=False)
            present = np.all(values > 0, axis=0)
            fraction = float((inside & present).sum() / inside.sum()) if inside.any() else None
            image = Image.fromarray(values[:3].transpose(1, 2, 0)).resize((360, 360), Image.Resampling.NEAREST)
            draw = ImageDraw.Draw(image)
            vertices = [~transform * pair for pair in geometry.exterior.coords]
            vertices = [(x / values.shape[2] * 360, y / values.shape[1] * 360) for x, y in vertices]
            draw.line(vertices, fill='#ff3be8', width=2)
            png = folder / f'{cell.sample_id}.png'
            image.save(png)
            rows.append(dict(sampleId=cell.sample_id, date=item_id.split('_')[4], dataPresenceFraction=fraction,
                             cloudFreeFraction=None, image=png.relative_to(ROOT).as_posix(), sha256=digest_file(png)))
    write_json(folder / 'chips.json', dict(generatedAt=now(), inputCellsSha256=digest_file(CELLS), sourceSha256=digest_file(source_path),
        sourceNativePixelMeters=2, viewContextMeters=60, display='Nearest neighbor, no tonal enhancement; magenta exact sampled cell boundary.',
        limitations=['Nonzero pixels do not certify absence of clouds, shadows, haze or misregistration.',
                     'PCA color input is native 8m multispectral fused with 2m PAN; it does not resolve all small vegetation.'], chips=rows))
    print(json.dumps(dict(item=item_id, chips=len(rows), dataPresent=sum(row['dataPresenceFraction'] == 1 for row in rows))), flush=True)


def pilot_sheet(item_id):
    folder = OUT / item_id
    records = json.loads((folder / 'chips.json').read_text(encoding='utf-8'))['chips']
    selected = np.random.default_rng(20261003).choice(len(records), 16, replace=False)
    sheet = Image.new('RGB', (4 * 360, 4 * 390), 'white')
    draw = ImageDraw.Draw(sheet)
    selected_ids = []
    for index, selected_index in enumerate(selected):
        row = records[int(selected_index)]
        x, y = index % 4 * 360, index // 4 * 390
        sheet.paste(Image.open(ROOT / row['image']), (x, y + 30))
        draw.text((x + 8, y + 8), row['sampleId'], fill='black')
        selected_ids.append(row['sampleId'])
    sheet.save(folder / 'blind-pilot-sheet.png')
    write_json(folder / 'pilot-selection.json', dict(seed=20261003, selection='16 IDs uniformly selected without replacement from the blinded 400-cell file; no strata or predictors read.', ids=selected_ids))


def esri_cells():
    cells = gpd.read_file(CELLS)
    records = []
    for level in [9, 10]:
        source = RAW / f'esri-metadata-{level}.json'
        data = json.loads(source.read_text(encoding='utf-8'))
        if 'error' in data:
            records.append(dict(layer=level, error=data['error']))
            continue
        coverage = gpd.GeoDataFrame.from_features(data['features'], crs=4326)
        for cell in cells.itertuples():
            intersected = coverage[coverage.intersects(cell.geometry)]
            records.append(dict(layer=level, sampleId=cell.sample_id,
                                candidates=[{key: value for key, value in row.items() if key != 'geometry'}
                                            for row in intersected.to_dict('records')]))
    write_json(OUT / 'esri-cell-metadata.json', dict(generatedAt=now(), data=records,
        limitation='Metadata query only. Tile imagery not acquired or redistributed. Date candidates are footprint metadata, not a guaranteed exact-pixel acquisition date.'))
    print(json.dumps(dict(metadataRows=len(records))), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['catalogs', 'chips', 'esri-cells', 'l4-bands', 'alignment'])
    parser.add_argument('--item')
    arguments = parser.parse_args()
    if arguments.action == 'catalogs':
        catalogs()
    elif arguments.action == 'chips':
        chips(arguments.item)
        pilot_sheet(arguments.item)
    elif arguments.action == 'l4-bands':
        l4_bands(arguments.item)
    elif arguments.action == 'alignment':
        relative_alignment()
    else:
        esri_cells()
