from __future__ import annotations

import csv
import json
from collections import Counter

import geopandas as gpd
import numpy as np
import rasterio
import warnings
from shapely.geometry import shape

from collect import ROOT, CATALOG, digest_file
from curate import OUTPUT, INTERIM, YEARS
from vegetation_palette import CANOPY_CLASSES, hex_rgb


def validate_vegetation_research(app, units):
    research = app['vegetationResearch']
    canopy = research['canopy']
    assert canopy['imageryDates'] == ['2019-09-16'] and canopy['publicationYear'] == 2026
    assert set(canopy['observations']) == {unit['id'] for unit in units}
    municipality = canopy['observations']['3305109']
    for observation in canopy['observations'].values():
        areas = [observation['modeledCanopyAreaHa'][str(value)] for value in canopy['thresholdsMeters']]
        assert areas == sorted(areas, reverse=True) and min(areas) >= 0
        comparison = observation['mapBiomas2019Comparison']
        assert abs(sum(entry['areaHa'] for entry in comparison['byMapBiomasClass'].values()) - comparison['modeledHeightAtLeast3mAreaHa']) < 0.00001
    for kind in ['district', 'neighborhood', 'census_sector']:
        subset = [canopy['observations'][unit['id']] for unit in units if unit['unitType'] == kind]
        assert sum(value['totalPixels'] for value in subset) == municipality['totalPixels']
        for threshold in ['2', '3', '5']:
            assert abs(sum(value['modeledCanopyAreaHa'][threshold] for value in subset) - municipality['modeledCanopyAreaHa'][threshold]) < 0.001
    chm_layer = next(layer for layer in app['evidenceLayers'] if layer['id'] == 'canopy-height')
    assert chm_layer['legend'][:3] == [dict(label=label, color=color) for _, _, label, color in CANOPY_CLASSES]
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', rasterio.errors.NotGeoreferencedWarning)
        with rasterio.open(OUTPUT / chm_layer['layerFile']) as image:
            pixels = image.read()
            assert max(image.width, image.height) <= 4096
            actual = set(map(tuple, np.unique(pixels[:3, pixels[3] == 230].T, axis=0)))
            assert actual == {tuple(hex_rgb(color)) for _, _, _, color in CANOPY_CLASSES}
    seasonal = research['seasonality']
    assert seasonal['year'] == 2025 and seasonal['sceneCount'] == 12
    assert {scene['month'] for scene in seasonal['scenes']} == set(range(1, 13))
    assert len({scene['id'] for scene in seasonal['scenes']}) == 12
    assert set(seasonal['observations']) == set(canopy['observations'])
    for observation in seasonal['observations'].values():
        assert 0 <= observation['coveragePct'] <= 100
        for key in ['medianNdviAbove04Pct', 'recurrentSignalPct', 'variableSignalPct']:
            assert observation[key] is None if observation['coveragePct'] < 95 else 0 <= observation[key] <= 100
    with rasterio.open(INTERIM / 'sentinel2-monthly-recurrence-2025.tif') as source:
        classes = source.read(1)
        assert source.crs.to_epsg() == 32723 and source.res == (10, 10)
        assert set(np.unique(classes)) == {0, 1, 2, 3, 4}
        eligible = (classes >= 1) & (classes <= 3)
        stats = seasonal['observations']['3305109']
        assert int((classes > 0).sum()) == stats['totalPixels']
        assert int(eligible.sum()) == stats['validPixels']
        for key, value in [('recurrentSignalPct', 3), ('variableSignalPct', 2)]:
            assert abs(float((classes[eligible] == value).mean() * 100) - stats[key]) < 0.0001
    reference = research['visualReference']
    assert reference['date'] == '2026-04-26' and reference['resolutionMeters'] == 2
    assert reference['cloudFreePct'] is None and reference['dataPresencePct'] > 99
    validation = research['validation']
    assert validation['status'] == 'awaiting_independent_reference'
    assert validation['estimandDate'] == '2026-10-01'
    assert validation['sampleCells'] == 400 and validation['referenceLabelsCompleted'] == 0
    design = json.loads((OUTPUT / 'validation/sampling-design.json').read_text(encoding='utf-8'))
    for entry in design['files']:
        assert digest_file(OUTPUT / 'validation' / entry['name']) == entry['sha256']
    samples = gpd.read_file(OUTPUT / 'validation/sample-cells-blinded.geojson')
    assert len(samples) == 400 and samples.sample_id.is_unique
    boundary = gpd.read_file(OUTPUT / 'layers/municipality.geojson').to_crs(32723).geometry.iloc[0]
    assert samples.to_crs(32723).geometry.difference(boundary.buffer(0.001)).is_empty.all()


def validate():
    app = json.loads((OUTPUT / 'phase3-app-data.json').read_text(encoding='utf-8'))
    assert app['schemaVersion'] == 'meriti.app-data.v1'
    assert app['studyArea']['code'] == '3305109'
    units = app['territorialUnits']
    assert len({u['id'] for u in units}) == len(units)
    assert Counter(u['unitType'] for u in units) == dict(municipality=1,district=3,neighborhood=16,census_sector=809)
    city = gpd.GeoSeries([shape(app['studyArea']['boundary']['features'][0]['geometry'])],crs=4326).to_crs(31983).iloc[0]
    for kind in ['municipality','district','neighborhood','census_sector']:
        subset = [u for u in units if u['unitType'] == kind]
        assert sum(u['populationTotal'] for u in subset) == 440962
        geometries = gpd.GeoSeries([shape(u['geometry']['geometry']) for u in subset],crs=4326).to_crs(31983)
        assert geometries.is_valid.all() and not geometries.is_empty.any()
        assert city.symmetric_difference(geometries.union_all()).area < 1
        assert abs(geometries.area.sum() - geometries.union_all().area) < 1
    for unit in units:
        assert unit['id'].startswith('3305109')
        assert unit['populationTotal'] >= 0 and unit['areaKm2'] > 0
        assert np.isfinite(unit['areaKm2'])
        assert not any('score' in key.lower() or 'rank' in key.lower() for key in unit)
        summary = app['opportunitySummaries'][unit['id']]
        assert summary['status'] == 'available'
        assert not any('score' in key.lower() or 'rank' in key.lower() for key in summary)
        assert all(signal['sourceMode']=='processed' for signal in summary['signals'])
        series = app['temporalEvidence']['observations'][unit['id']]
        assert set(series)==set(map(str,YEARS))
        for observation in series.values():
            assert 0 <= observation['vegetationPct'] <= 100
            assert 0 <= observation['urbanPct'] <= 100
            assert observation['validPixels'] <= observation['totalPixels']
            assert observation['coveragePct'] >= 95
            assert observation['vegetationPct']+observation['urbanPct'] <= 100.0001
    with CATALOG.open(encoding='utf-8', newline='') as stream:
        catalog={row['id']:row for row in csv.DictReader(stream)}
    assert len(app['evidenceLayers'])==21
    income = app['income']
    assert income['referenceYear'] == 2022 and income['inflationAdjusted'] is False
    assert income['sectorCoverage'] == dict(total=809, published=805, no_record=2, suppressed=2)
    assert income['observations']['3305109']['meanMonthlyBRL'] == 1893.05
    assert income['observations']['3305109']['medianMonthlyBRL'] == 1300
    for layer in app['evidenceLayers']:
        assert all(catalog[ident]['promotion_status']=='promoted' for ident in layer['sourceDatasetIds'])
        assert layer['limitation'] and layer['temporalCoverage']
        files = set([layer['layerFile'], *layer.get('yearFiles',{}).values()])
        for name in files:
            path = OUTPUT/name
            assert path.resolve().is_relative_to(OUTPUT.resolve())
            if layer.get('image'):
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore',rasterio.errors.NotGeoreferencedWarning)
                    with rasterio.open(path) as raster:
                        assert raster.count==4 and raster.width==layer['image']['width'] and raster.height==layer['image']['height']
                        alpha=raster.read(4)
                        assert (alpha>0).any() and (alpha==0).any()
                assert len(layer['image']['coordinates'])==4
                continue
            data = json.loads(path.read_text(encoding='utf-8'))
            assert data['type']=='FeatureCollection' and data['features']
            for feature in data['features']:
                geometry=gpd.GeoSeries([shape(feature['geometry'])],crs=4326).to_crs(31983).iloc[0]
                assert geometry.is_valid and not geometry.is_empty
                assert geometry.difference(city.buffer(layer.get('coverageBufferMeters',0)+0.05)).is_empty
                assert feature['properties']['overlayColor'].startswith('#')
    assert len(app['protectedAreas'])==6
    protected=gpd.read_file(OUTPUT/'layers/protected-areas.geojson').to_crs(31983)
    polygons=protected[protected.geom_type.isin(['Polygon','MultiPolygon'])]
    points=protected[protected.geom_type=='Point']
    assert len(polygons)==6 and len(points)==6
    for row in points.itertuples():
        assert polygons[polygons.id==row.id].geometry.iloc[0].contains(row.geometry)
    rivers=gpd.read_file(OUTPUT/'layers/rivers-official.geojson').to_crs(31983)
    assert rivers.id.is_unique and set(rivers['name']) >= {'Rio Pavuna','Canal de Sarapuí','Rio Acari','Rio São João de Meriti'}
    assert abs(rivers.length.sum()-rivers.geometry.union_all().length)<0.1
    density=gpd.read_file(OUTPUT/'layers/population.geojson')
    assert len(density)==809 and density.populationTotal.sum()==440962
    assert np.allclose(density.populationDensity,density.populationTotal/density.areaKm2)
    recent=app['recentVegetation']
    assert recent['sceneCount']==6 and recent['minimumObservations']==3
    assert recent['observations']['3305109']['coveragePct']>=95
    assert set(recent['observations'])=={unit['id'] for unit in units}
    for value in recent['observations'].values():
        assert 0<=value['coveragePct']<=100 and value['validPixels']<=value['totalPixels']
        assert value['minimumObservations']>=3
        percentages=[value['vegetationSignalPct'][str(threshold)] for threshold in recent['thresholds']]
        if value['coveragePct']<95:
            assert all(pct is None for pct in percentages)
        else:
            assert all(0<=pct<=100 for pct in percentages)
            assert percentages==sorted(percentages,reverse=True)
    with rasterio.open(INTERIM/'sentinel2-ndvi-2026.tif') as ndvi_raster, rasterio.open(INTERIM/'sentinel2-observations-2026.tif') as counts_raster:
        ndvi=ndvi_raster.read(1,masked=True)
        assert ndvi_raster.crs.to_epsg()==32723 and ndvi_raster.res==(10,10)
        assert ((ndvi.compressed()>=-1)&(ndvi.compressed()<=1)).all()
        assert (counts_raster.read(1)[~ndvi.mask]>=3).all()
        assert ndvi.count()==recent['observations']['3305109']['validPixels']
        for threshold in recent['thresholds']:
            assert abs(float((ndvi.compressed()>=threshold).mean()*100)-recent['observations']['3305109']['vegetationSignalPct'][str(threshold)])<0.0001
    report=json.loads((OUTPUT/'metadata/data-quality-report.json').read_text(encoding='utf-8'))
    validate_vegetation_research(app, units)
    reference = app['neighborhoodReference']
    assert len(reference['comparison']) == 21
    assert sum(row['ibgeId'] is not None for row in reference['comparison']) == 15
    assert len(reference['localities']) == 6
    assert Counter(item['geometry']['geometry']['type'] for item in reference['localities']) == dict(Polygon=5, Point=1)
    official_ids = {unit['id'] for unit in units if unit['unitType'] == 'neighborhood'}
    for locality in reference['localities']:
        assert locality['id'] not in app['opportunitySummaries']
        assert locality['id'] not in app['recentVegetation']['observations']
        assert locality['id'] not in app['temporalEvidence']['observations']
        assert 'populationTotal' not in locality
        assert shape(locality['geometry']['geometry']).is_valid
        assert locality['ibgeOverlaps'] and all(item['id'] in official_ids for item in locality['ibgeOverlaps'])
    polygons = gpd.read_file(OUTPUT/'layers/local-neighborhoods.geojson').to_crs(31983)
    polygons = polygons[polygons.geometry.geom_type == 'Polygon']
    assert abs(polygons.area.sum() - polygons.geometry.union_all().area) < 1
    assert polygons.geometry.difference(city.buffer(20)).area.sum() < 1
    comparison = {row['name']: row for row in reference['comparison']}
    assert comparison['São Mateus']['ibgeName'] == 'São Matheus'
    assert comparison['Parque Novo Rio']['ibgeId'] is None
    assert comparison['Parque Novo Rio']['localityId'] == 'atlas-parque-novo-rio'
    metadata = json.loads((OUTPUT/'metadata/neighborhood-georeferencing.json').read_text(encoding='utf-8'))
    assert digest_file(ROOT/'data/raw/meriti/municipal_neighborhoods__2026/uerj-bairros-localidades.pdf') == metadata['sourcePdfSha256']
    assert metadata['sourceBoundaryDate'] is None and metadata['sourceBoundaryAccuracyM'] is None
    assert report['sanitation']['unclassifiedHouseholds']==616
    assert report['sanitation']['minimumReportedCoveragePct']>=95
    assert 45 < report['flood']['classifiedMunicipalAreaPct'] < 47
    manifest=json.loads((OUTPUT/'metadata/output-manifest.json').read_text(encoding='utf-8'))
    for entry in manifest['files']:
        assert digest_file(ROOT/entry['path'])==entry['sha256']
    field=app['vegetationResearch']['fieldEvidence']
    assert set(field['observations']) == {unit['id'] for unit in units}
    city_field=field['observations']['3305109']
    assert city_field['residents']['withTrees'] == 219493 and city_field['residents']['surveyedTotal'] == 440574
    assert field['summary']['sectorsWithObservedTreePresence'] == 761
    for observation in field['observations'].values():
        for metric in ['residents','households','faces']:
            value=observation[metric]
            if value is not None and value['withTreesPct'] is not None:
                assert abs(value['withTreesPct']-100*value['withTrees']/value['surveyedTotal']) < 1e-9
    field_layer=json.loads((OUTPUT/'layers/street-trees-census.geojson').read_text(encoding='utf-8'))
    assert len(field_layer['features']) == 809
    assert sum(item['properties']['residentsWithTreesPct'] is None for item in field_layer['features']) == 4
    audit=app['vegetationResearch']['referenceAudit']
    assert audit['acceptedFractionLabels'] == 0 and audit['aiPilot']['reviewedCells'] == 16
    assert audit['openReference']['acquisitionDate'] == '2026-07-02'
    print('PASS: 829 territories, population conservation, topology, 21 layers, income at official scales with 805/809 published sectors, 21 municipal names, 5 approximate boundaries and 1 label point without assigned statistics, 6 protected areas, deduplicated rivers, satellite masks/coverage, CHM classes/dates/area conservation, 12 months, 400 registered samples, provenance, hashes, no scores or ranks.')


if __name__ == '__main__':
    validate()
